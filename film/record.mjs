// Records the product film described in scenes.mjs: drives the real app in a browser, renders it frame by frame,
// speaks each line, and writes one part per scene, then joins the parts without re-encoding.
//
//   node record.mjs            record the chosen scenes (FILM_CHAPTERS) and join the film
//   node record.mjs approval   the script, a voice sample and still frames, for sign-off before recording
//   node record.mjs join       join the parts already recorded
//
// Settings (environment): FILM_VOICE, FILM_SPEED, FILM_WIDTH, FILM_HEIGHT, FILM_SCALE, FILM_FPS, FILM_CHAPTERS, FILM_JOBS.
import puppeteer from "puppeteer";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { FILM } from "./scenes.mjs";

const env = (k, d) => (process.env[k] === undefined || process.env[k] === "" ? d : process.env[k]);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VOICE = env("FILM_VOICE", "af_heart"), SPEED = env("FILM_SPEED", "1.05");
const W = +env("FILM_WIDTH", 1920), H = +env("FILM_HEIGHT", 1080), SCALE = +env("FILM_SCALE", 2), FPS = +env("FILM_FPS", 30), FRAME = 1000 / FPS;
const OUT = env("FILM_OUT", "/out"), CACHE = env("FILM_CACHE", "/cache"), APP = env("FILM_APP", path.join(HERE, "app"));
const TMP = path.join(os.tmpdir(), "film"), PARTS = path.join(OUT, "parts"), FAILS = path.join(OUT, "failures");
const JOBS = +env("FILM_JOBS", Math.max(1, Math.min(9, Math.floor(os.cpus().length / 2))));
const HOLD_AFTER = 0.5, NAME = "roadmap-builder-film";

const run = (cmd, args, opts) => execFileSync(cmd, args, Object.assign({ stdio: ["pipe", "pipe", "pipe"], maxBuffer: 1 << 28 }, opts));
const runAsync = promisify(execFile);
const seconds = f => parseFloat(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const lineOf = x => (typeof x === "string" ? { say: x, show: x } : x);

/* ---------- the scenes, checked before anything is recorded ---------- */
const SCENES = [FILM.opening, ...FILM.chapters, FILM.closing];
function check() {
  SCENES.forEach(s => {
    const want = s.cards.length + s.steps.length;
    if (s.lines.length !== want) throw new Error('Scene "' + s.id + '" has ' + s.lines.length + " spoken lines but " + s.cards.length + " card(s) and " + s.steps.length + " step(s). It needs exactly " + want + " lines. Nothing was recorded.");
    s.lines = s.lines.map(lineOf);
  });
}
function chosen() {
  const want = String(env("FILM_CHAPTERS", "all")).split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!want.length || want.indexOf("all") >= 0) return SCENES;
  const list = SCENES.filter((s, i) => want.some(w => w === s.id.toLowerCase() || w === s.id.slice(3).toLowerCase() || (w === "opening" && i === 0) || (w === "closing" && i === SCENES.length - 1) || (/^\d+$/.test(w) && +w === i && i > 0 && i < SCENES.length - 1)));
  if (!list.length) throw new Error('FILM_CHAPTERS="' + env("FILM_CHAPTERS") + '" matches no scene. Use all, opening, closing, a chapter number, or one of: ' + SCENES.map(s => s.id).join(", "));
  return list;
}

/* ---------- voice: every line is spoken once and kept ---------- */
function speak(scenes) {
  const dir = path.join(CACHE, VOICE + "-" + SPEED); fs.mkdirSync(dir, { recursive: true });
  const todo = [];
  scenes.forEach(s => s.lines.forEach(l => { l.file = path.join(dir, crypto.createHash("sha1").update(VOICE + "|" + SPEED + "|" + l.say).digest("hex").slice(0, 16) + ".wav"); if (!fs.existsSync(l.file) && !todo.some(t => t.file === l.file)) todo.push({ say: l.say, file: l.file }); }));
  if (todo.length) {
    fs.mkdirSync(TMP, { recursive: true }); const manifest = path.join(TMP, "say-" + process.pid + ".json"); fs.writeFileSync(manifest, JSON.stringify(todo));
    process.stdout.write(run(env("FILM_PYTHON", "/opt/tts/bin/python"), [path.join(HERE, "speak.py"), manifest], { env: Object.assign({}, process.env, { FILM_VOICE: VOICE, FILM_SPEED: SPEED }) }).toString());
  }
  console.log("Voice " + VOICE + " at speed " + SPEED + ": " + todo.length + " line(s) spoken now, the rest reused.");
  scenes.forEach(s => s.lines.forEach(l => { l.dur = seconds(l.file); }));
}

/* ---------- a small file server: the stage, the app, and files the app exports ---------- */
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webmanifest": "application/manifest+json" };
function serve(exportsDir) {
  const roots = [["/app/", APP], ["/fonts/", path.join(APP, "fonts")], ["/exports/", exportsDir]];
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname), file = p === "/stage.html" ? path.join(HERE, "stage.html") : null;
    for (const [prefix, root] of roots) if (!file && p.startsWith(prefix)) { const f = path.join(root, p.slice(prefix.length) || "index.html"); if (f.startsWith(root)) file = f; }
    if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

/* ---------- the page's clock: timers and animations only move when the recorder steps them, one frame at a time ---------- */
const CLOCK = `(() => {
  if (window.__film) return;
  const RealDate = Date, start = RealDate.now(), perf0 = performance.now(), timers = new Map(), seen = new WeakSet();
  let now = start, seq = 0;
  class FilmDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } }
  window.Date = FilmDate; performance.now = () => perf0 + (now - start);
  const add = (fn, delay, every, args) => { const id = ++seq; timers.set(id, { fn, at: now + Math.max(0, +delay || 0), every, args }); return id; };
  window.setTimeout = (fn, d, ...a) => add(fn, d, 0, a);
  window.setInterval = (fn, d, ...a) => add(fn, d, Math.max(1, +d || 0), a);
  window.clearTimeout = window.clearInterval = id => { timers.delete(id); };
  window.requestAnimationFrame = fn => add(() => fn(performance.now()), 16, 0, []);
  window.cancelAnimationFrame = id => { timers.delete(id); };
  window.__film = { tick(ms) {
    const end = now + ms;
    for (let guard = 0; guard < 5000; guard++) {
      let id = 0, next = null; for (const [k, t] of timers) if (t.at <= end && (!next || t.at < next.at)) { id = k; next = t; }
      if (!next) break;
      now = Math.max(now, next.at); if (next.every) next.at = now + next.every; else timers.delete(id);
      try { if (typeof next.fn === "function") next.fn(...next.args); } catch (e) { console.error(e); }
    }
    now = end;
    for (const a of document.getAnimations()) {
      if (!seen.has(a)) { seen.add(a); a.pause(); a.currentTime = 0; }
      const t = (a.currentTime || 0) + ms, stop = a.effect ? a.effect.getComputedTiming().endTime : Infinity;
      if (t >= stop) a.finish(); else a.currentTime = t;
    }
  } };
})();`;

/* ---------- subtitles: one short phrase at a time ---------- */
function phrases(text) {
  const out = [];
  text.match(/[^.!?]+[.!?]+|[^.!?]+$/g).map(s => s.trim()).filter(Boolean).forEach(s => {
    if (s.length <= 46) { out.push(s); return; }
    let line = "";
    s.split(/(?<=,)\s+|\s+(?=and |with |in one )/).forEach(part => { if (line && (line + " " + part).length > 46) { out.push(line); line = part; } else line = line ? line + " " + part : part; });
    if (line) out.push(line);
  });
  return out;
}

/* ---------- record one scene into one part ---------- */
async function record(scene, stills) {
  const dir = path.join(TMP, scene.id), frames = path.join(dir, "frames"), exportsDir = path.join(dir, "exports");
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true }); fs.mkdirSync(exportsDir, { recursive: true });
  const server = await serve(exportsDir), base = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--force-color-profile=srgb", "--font-render-hinting=none", "--hide-scrollbars", "--disable-dev-shm-usage"] });
  const errors = []; let stepNo = 0, saying = "";
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(CLOCK);
    page.on("pageerror", e => errors.push(scene.id + ": " + String(e)));
    page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(scene.id + ": " + m.text()); });
    const cdp = await page.createCDPSession(), whole = await browser.target().createCDPSession();
    await whole.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: exportsDir });
    await page.goto(base + "stage.html", { waitUntil: "load" });
    const load = src => page.evaluate(src => new Promise(done => { const i = document.getElementById("app"); i.onload = () => done(); i.src = src; }), src);
    const app = () => page.frames().find(fr => fr.parentFrame() === page.mainFrame());
    const fonts = async () => { for (const fr of page.frames()) await fr.evaluate(() => document.fonts.ready.then(() => Promise.all(Array.from(document.fonts).map(f => f.load().catch(() => 0))))).catch(() => {}); };
    await load("app/index.html");
    const win = await page.evaluate(() => { const w = document.getElementById("win"); return { x: w.offsetLeft, y: w.offsetTop }; });

    // Set the stage before the first frame: mode, panel, columns, scroll position.
    await app().evaluate(s => {
      const R = window.__roadmap, click = sel => document.querySelector(sel).click();
      if (s.panelW) R.state.settings.panelW = s.panelW;
      click(s.mode === "edit" ? "#modeEdit" : "#modeView");
      if (s.columns === false) { click("#modeEdit"); click("#ey-colStart"); click("#ey-colEnd"); click(s.mode === "edit" ? "#modeEdit" : "#modeView"); }
      document.querySelector("#toast").hidden = true;
      if (s.steps && s.id !== "04-cards" && s.id !== "06-share") { document.querySelector("#stage").scrollIntoView(); window.scrollBy(0, -58); }
    }, { panelW: scene.panelW, mode: scene.mode, columns: scene.columns, steps: scene.steps.length > 0, id: scene.id });
    await fonts();

    let n = 0, due = 0, cur = { x: W / 2, y: H * 0.55 };
    const cues = [], marks = [];
    const tick = async () => { for (const fr of page.frames()) await fr.evaluate(ms => { if (window.__film) window.__film.tick(ms); }, FRAME).catch(() => {}); };
    const frame = async () => {
      await tick();
      const r = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 95, optimizeForSpeed: true, clip: { x: 0, y: 0, width: W, height: H, scale: SCALE } });
      await fs.promises.writeFile(path.join(frames, String(n++).padStart(6, "0") + ".jpg"), Buffer.from(r.data, "base64"));
      due = Math.max(due, n * FRAME);
    };
    const hold = async ms => { due += ms; while ((n + 0.5) * FRAME < due) await frame(); };
    const still = async name => { const r = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: W, height: H, scale: SCALE } }); fs.writeFileSync(name, Buffer.from(r.data, "base64")); };
    const pointer = (x, y, ms) => page.evaluate(([x, y, ms]) => { const p = document.getElementById("ptr"); p.style.transition = (ms ? "transform " + ms + "ms cubic-bezier(.35,.05,.2,1)," : "") + "opacity .4s ease"; p.style.transform = "translate(" + x + "px," + y + "px)"; }, [x, y, ms]);
    const subs = text => page.evaluate(t => { document.getElementById("subs").textContent = t; }, text);
    const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    /* the toolkit handed to each step */
    const f = {
      pause: hold,
      eval: (fn, ...args) => app().evaluate(fn, ...args),
      async rect(sel) { return app().evaluate(sel => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return r.width && r.height ? { x: r.x, y: r.y, w: r.width, h: r.height, vh: innerHeight } : null; }, sel).catch(() => null); },
      // Find a thing on screen. If the page is redrawing, look again on the next frame; scroll it into view if needed.
      async at(sel, fx = 0.5, fy = 0.5) {
        for (let tries = 0; tries < 150; tries++) {
          const r = await f.rect(sel);
          if (!r) { await frame(); continue; }
          if (r.y < 62 || r.y + r.h > r.vh - 24) { await f.scrollBy(r.y + r.h / 2 - r.vh / 2); continue; }
          return { x: win.x + r.x + r.w * fx, y: win.y + r.y + r.h * fy };
        }
        throw new Error("Nothing on screen matches " + sel);
      },
      async scrollBy(dy, ms = 650) {
        await app().evaluate(([dy, ms]) => { const y0 = scrollY, t0 = Date.now(), id = setInterval(() => { const t = Math.min(1, (Date.now() - t0) / ms), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; scrollTo(0, y0 + dy * e); if (t >= 1) clearInterval(id); }, 8); }, [dy, ms]);
        await hold(ms + 150);
      },
      async top() { await f.scrollBy(-(await app().evaluate(() => scrollY)), 800); },
      async glide(p) {
        const ms = Math.round(Math.min(950, 380 + Math.hypot(p.x - cur.x, p.y - cur.y) * 0.75));
        await pointer(p.x, p.y, ms); await hold(ms); await page.mouse.move(p.x, p.y, { steps: 4 }); cur = p; await hold(120);
      },
      async ring() { await page.evaluate(([x, y]) => { const d = document.createElement("div"); d.className = "ring"; d.style.left = x + "px"; d.style.top = y + "px"; document.body.appendChild(d); setTimeout(() => d.remove(), 650); }, [cur.x, cur.y]); },
      async hover(sel, o = {}) { await f.glide(await f.at(sel, o.fx, o.fy)); },
      async click(sel, o = {}) { await f.hover(sel, o); await f.ring(); await page.mouse.down({ button: o.button || "left" }); await hold(70); await page.mouse.up({ button: o.button || "left" }); await hold(280); },
      async menu(text) {
        await f.waitFor("#ctx");
        const i = await app().evaluate(t => Array.from(document.querySelectorAll("#ctx button")).findIndex(b => b.textContent.indexOf(t) >= 0), text);
        if (i < 0) throw new Error('The right-click menu has no item containing "' + text + '"');
        await f.click("#ctx button[data-ctx]:nth-of-type(" + (i + 1) + ")");
      },
      async type(text, delay = 50) { for (const c of text) { if (c === "\n") await page.keyboard.press("Enter"); else await page.keyboard.type(c); await hold(delay); } },
      async key(combo) { const keys = combo.split("+"), last = keys.pop(); for (const k of keys) await page.keyboard.down(k); await page.keyboard.press(last.length === 1 ? last.toLowerCase() : last); for (const k of keys.reverse()) await page.keyboard.up(k); await hold(90); },
      async set(sel, value) { await app().evaluate(([sel, value]) => { const el = document.querySelector(sel); el.value = value; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }, [sel, value]); await hold(90); },
      // Put the caret on a piece of text in a text box (or just after it), the way a double-click and drag would.
      async select(sel, text, where) {
        await f.hover(sel, { fx: 0.5, fy: 0.3 }); await f.ring();
        const ok = await app().evaluate(([sel, text, after]) => { const el = document.querySelector(sel), i = el.value.indexOf(text); if (i < 0) return false; el.focus(); el.setSelectionRange(after ? i + text.length : i, i + text.length);
          const line = el.value.slice(0, i).split("\n").length - 1, lh = parseFloat(getComputedStyle(el).lineHeight) || 17; el.scrollTop = Math.max(0, line * lh - el.clientHeight / 3); el.scrollLeft = 0; return true; }, [sel, text, where === "after"]);
        if (!ok) throw new Error('"' + text + '" is not in ' + sel);
        await hold(450);
      },
      async sweep(sel, fx1, fx2, ms = 1500) { const a = await f.at(sel, fx1), b = await f.at(sel, fx2); await f.glide(a); await f.path(a, b, ms); },
      async drag(sel, dx, dy, o = {}) { const a = await f.at(sel, o.fx, o.fy); await f.glide(a); await f.ring(); await page.mouse.down(); await hold(130); await f.path(a, { x: a.x + dx, y: a.y + dy }, o.ms || 1100); await hold(130); await page.mouse.up(); await hold(260); },
      async path(a, b, ms) { const steps = Math.max(8, Math.round(ms / FRAME)); for (let i = 1; i <= steps; i++) { const e = ease(i / steps), x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e; await pointer(x, y, 0); await page.mouse.move(x, y); await frame(); } cur = b; },
      async waitFor(sel, o = {}) {
        for (let i = 0; i < (o.frames || 240); i++) {
          if (await app().evaluate(([sel, text]) => { const el = document.querySelector(sel); if (!el || el.hidden) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (!text || el.textContent.indexOf(text) >= 0); }, [sel, o.text || ""]).catch(() => false)) return;
          await frame();
        }
        throw new Error(sel + (o.text ? ' never showed "' + o.text + '"' : " never appeared"));
      },
      async open(src) { await load(src); await fonts(); await hold(400); },
      async exported(ext) {
        for (let i = 0; i < 200; i++) { const hit = fs.readdirSync(exportsDir).find(x => x.endsWith(ext)); if (hit) return "exports/" + encodeURIComponent(hit); await frame(); await sleep(40); }
        throw new Error("No exported file ending in " + ext + " arrived");
      }
    };

    const say = async line => {
      saying = line.show;
      const start = n / FPS + 0.12, parts = phrases(line.show), total = parts.reduce((a, p) => a + p.length, 0); let t = start;
      const mine = parts.map(p => { const c = { start: t, end: t + line.dur * p.length / total, text: p }; t = c.end; return c; });
      mine.forEach(c => cues.push(c)); marks.push({ file: line.file, start });
      const end = start + line.dur + HOLD_AFTER; let shown = null;
      while (n / FPS < end) { const now = n / FPS, c = mine.find(c => now >= c.start - 0.001 && now < c.end + 0.12), text = c ? c.text : ""; if (text !== shown) { await subs(text); shown = text; } await frame(); }
      await subs("");
    };
    const card = async c => { await page.evaluate(c => { const el = document.getElementById("card"); el.querySelector("small").textContent = c.small || ""; el.querySelector("h1").textContent = c.heading; el.querySelector("p").textContent = c.line || ""; el.classList.add("on"); }, c); await hold(700); };
    const cardOff = async () => { await page.evaluate(() => document.getElementById("card").classList.remove("on")); await hold(650); };

    await hold(200);
    for (let i = 0; i < scene.cards.length; i++) { stepNo = -(i + 1); if (i) await cardOff(); await card(scene.cards[i]); if (stills && i === 0) { await still(stills.card); if (!scene.steps.length) return null; } await say(scene.lines[i]); }
    if (scene.steps.length) {
      await page.evaluate(() => { document.getElementById("card").classList.remove("on"); document.getElementById("win").classList.remove("down"); }); await pointer(cur.x, cur.y, 0); await hold(1000);
      if (stills) { await still(stills.window); return null; }
      for (let i = 0; i < scene.steps.length; i++) { stepNo = i + 1; saying = scene.lines[scene.cards.length + i].show; await scene.steps[i](f); await say(scene.lines[scene.cards.length + i]); }
      stepNo = 0; await page.evaluate(() => document.getElementById("win").classList.add("down")); await hold(950);
    } else { await hold(500); await cardOff(); }

    // Encode this part: the pictures, and the spoken lines laid on their cues at broadcast loudness.
    const total = n / FPS, mp4 = path.join(PARTS, scene.id + ".mp4"), args = ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frames, "%06d.jpg")];
    marks.forEach(m => args.push("-i", m.file));
    const filter = "[0:v]format=yuv420p[v];" + marks.map((m, i) => "[" + (i + 1) + ":a]aresample=48000,afade=t=in:d=0.02,adelay=" + Math.round(m.start * 1000) + ":all=1[a" + i + "]").join(";") + ";" +
      marks.map((m, i) => "[a" + i + "]").join("") + "amix=inputs=" + marks.length + ":normalize=0,highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad[a]";
    args.push("-filter_complex", filter, "-map", "[v]", "-map", "[a]", "-t", total.toFixed(4), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-g", String(FPS * 2), "-pix_fmt", "yuv420p",
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-video_track_timescale", "30000", mp4);
    await runAsync("ffmpeg", args, { maxBuffer: 1 << 28 });
    fs.writeFileSync(path.join(PARTS, scene.id + ".json"), JSON.stringify({ id: scene.id, title: scene.title, frames: n, duration: seconds(mp4), cues, errors, voice: VOICE, speed: SPEED, size: W * SCALE + "x" + H * SCALE }, null, 1));
    console.log("recorded " + scene.id + "  " + total.toFixed(1) + "s  " + n + " frames  " + (errors.length ? errors.length + " page error(s)" : "no page errors"));
    return true;
  } catch (e) {
    // Say exactly where it stopped, and keep a picture of that moment.
    fs.mkdirSync(FAILS, { recursive: true }); const shot = path.join(FAILS, scene.id + "-step-" + (stepNo < 0 ? "card" + -stepNo : stepNo) + ".jpg");
    try { const pages = await browser.pages(); await pages[pages.length - 1].screenshot({ path: shot, type: "jpeg", quality: 85 }); } catch (x) { /* the browser may be gone */ }
    const where = stepNo < 0 ? "card " + -stepNo : stepNo ? "step " + stepNo : "the end of the scene";
    throw new Error('Scene "' + scene.id + '" failed at ' + where + (saying ? ' ("' + saying + '")' : "") + ": " + e.message + "\nA screenshot of that moment is in " + shot);
  } finally { await browser.close().catch(() => {}); server.close(); fs.rmSync(dir, { recursive: true, force: true }); }
}

/* ---------- join the parts without re-encoding; write the copies, subtitles, chapter list and a report ---------- */
const clock = (t, sep) => { const ms = Math.max(0, Math.round(t * 1000)), p = (v, l) => String(v).padStart(l, "0"); return p(Math.floor(ms / 3600000), 2) + ":" + p(Math.floor(ms / 60000) % 60, 2) + ":" + p(Math.floor(ms / 1000) % 60, 2) + sep + p(ms % 1000, 3); };
function join() {
  const missing = SCENES.filter(s => !fs.existsSync(path.join(PARTS, s.id + ".json")));
  if (missing.length) { console.log("Not joined yet: no recording of " + missing.map(s => s.id).join(", ") + ". Record those scenes, or run with FILM_CHAPTERS=all."); return; }
  const parts = SCENES.map(s => JSON.parse(fs.readFileSync(path.join(PARTS, s.id + ".json"), "utf8")));
  let t = 0, srt = "", n = 1, meta = ";FFMETADATA1\ntitle=" + FILM.name + ": the full tour\n", chapters = "";
  parts.forEach(p => {
    meta += "[CHAPTER]\nTIMEBASE=1/1000\nSTART=" + Math.round(t * 1000) + "\nEND=" + Math.round((t + p.duration) * 1000) + "\ntitle=" + p.title + "\n";
    chapters += clock(t, ".").slice(3, 8) + "  " + p.title + "\n";
    p.cues.forEach(c => { srt += n++ + "\n" + clock(t + c.start, ",") + " --> " + clock(t + c.end, ",") + "\n" + c.text + "\n\n"; });
    t += p.duration;
  });
  const list = path.join(PARTS, "list.txt"), ffmeta = path.join(PARTS, "chapters.ffmeta"), k4 = path.join(OUT, NAME + "-4k.mp4"), hd = path.join(OUT, NAME + "-1080p.mp4");
  fs.writeFileSync(list, parts.map(p => "file '" + path.join(PARTS, p.id + ".mp4") + "'").join("\n") + "\n"); fs.writeFileSync(ffmeta, meta);
  run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-i", ffmeta, "-map", "0", "-map_metadata", "1", "-map_chapters", "1", "-c", "copy", "-movflags", "+faststart", k4]);
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", k4, "-map", "0", "-map_chapters", "0", "-vf", "scale=1920:1080:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", hd]);
  fs.writeFileSync(path.join(OUT, NAME + ".srt"), srt); fs.writeFileSync(path.join(OUT, "chapters.txt"), chapters);
  const stream = (f, kind) => run("ffprobe", ["-v", "error", "-select_streams", kind, "-show_entries", "stream=codec_name,width,height,r_frame_rate,duration", "-of", "json", f]).toString();
  const v = JSON.parse(stream(k4, "v:0")).streams[0], a = JSON.parse(stream(k4, "a:0")).streams[0];
  let loud = ""; try { run("ffmpeg", ["-hide_banner", "-nostats", "-i", k4, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]); } catch (e) { loud = String(e.stderr || ""); }
  if (!loud) loud = execFileSync("sh", ["-c", 'ffmpeg -hide_banner -nostats -i "$0" -vn -af ebur128=peak=true -f null - 2>&1 | tail -12', k4]).toString();
  const report = { film: path.basename(k4), size: v.width + "x" + v.height, frameRate: v.r_frame_rate, videoCodec: v.codec_name, audioCodec: a.codec_name, pictureSeconds: +(+v.duration).toFixed(3), soundSeconds: +(+a.duration).toFixed(3),
    loudnessLUFS: +((/I:\s+(-?[\d.]+) LUFS/.exec(loud) || [])[1] || NaN), truePeakDb: +((/Peak:\s+(-?[\d.]+) dBFS/.exec(loud) || [])[1] || NaN), voice: parts[0].voice, speed: parts[0].speed,
    chapters: parts.map(p => ({ id: p.id, title: p.title, seconds: p.duration })), pageErrors: parts.flatMap(p => p.errors) };
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
  console.log("\nFilm: " + k4 + "  (" + report.size + ", " + clock(t, ".").slice(3, 8) + ")\n1080p copy: " + hd + "\nSubtitles: " + NAME + ".srt\n\nChapters\n" + chapters +
    "\nPicture " + report.pictureSeconds + "s, sound " + report.soundSeconds + "s, loudness " + report.loudnessLUFS + " LUFS, page errors: " + (report.pageErrors.length ? "\n  " + report.pageErrors.join("\n  ") : "none"));
}

/* ---------- approval pack: the script, a voice sample, and stills ---------- */
async function approval() {
  const dir = path.join(OUT, "approval"); fs.mkdirSync(dir, { recursive: true });
  let md = "# " + FILM.name + ": product film script\n\nTagline: " + FILM.tagline + "  \nAudience: " + FILM.audience + "  \nAddress: " + FILM.address + "  \nVoice: Kokoro " + VOICE + ", speed " + SPEED + "\n\nEach line is spoken after its card appears or its step has happened. Where the voice and the subtitles are spelt differently, both are shown.\n";
  let n = 0;
  SCENES.forEach(s => {
    md += "\n## " + s.title + "\n\n";
    s.lines.forEach((l, i) => { n++; const c = s.cards[i]; md += (c ? "- **Card: " + c.heading + "** (" + c.line + ")" : "- Step " + (i - s.cards.length + 1)) + "  \n  " + l.show + (l.say !== l.show ? "  \n  *spoken as:* " + l.say : "") + "\n"; });
  });
  md += "\n" + n + " spoken lines in " + SCENES.length + " scenes.\n"; fs.writeFileSync(path.join(dir, "script.md"), md);
  // About twenty seconds of the opening lines, as they will sound in the film.
  const lines = SCENES.flatMap(s => s.lines), pick = []; let total = 0; for (const l of lines) { if (total >= 20) break; pick.push(l); total += l.dur + 0.6; }
  const args = ["-y", "-loglevel", "error"]; pick.forEach(l => args.push("-i", l.file)); let t = 0.3;
  const filter = pick.map((l, i) => { const s = "[" + i + ":a]aresample=48000,adelay=" + Math.round(t * 1000) + ":all=1[a" + i + "]"; t += l.dur + 0.6; return s; }).join(";") + ";" + pick.map((l, i) => "[a" + i + "]").join("") + "amix=inputs=" + pick.length + ":normalize=0,highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11[a]";
  run("ffmpeg", args.concat(["-filter_complex", filter, "-map", "[a]", "-c:a", "libmp3lame", "-b:a", "192k", "-ar", "48000", path.join(dir, "voice-sample.mp3")]));
  await record(FILM.chapters[0], { card: path.join(dir, "still-chapter-card.png"), window: path.join(dir, "still-app-window.png") });
  await record(FILM.opening, { card: path.join(dir, "still-opening-card.png") });
  console.log("Approval pack written to " + dir + ": script.md, voice-sample.mp3 (" + seconds(path.join(dir, "voice-sample.mp3")).toFixed(1) + "s), three stills at " + W * SCALE + "x" + H * SCALE);
}

/* ---------- main ---------- */
const mode = process.argv[2] || "record";
check();
[OUT, PARTS, TMP].forEach(d => fs.mkdirSync(d, { recursive: true }));
if (mode === "join") join();
else if (mode === "approval") { speak(SCENES); await approval(); }
else {
  const scenes = chosen(); speak(scenes);
  console.log("Recording " + scenes.length + " scene(s) at " + W * SCALE + "x" + H * SCALE + ", " + FPS + " fps, " + Math.min(JOBS, scenes.length) + " at a time: " + scenes.map(s => s.id).join(", "));
  const queue = scenes.slice(), failures = [];
  await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => { for (let s; (s = queue.shift());) { try { await record(s); } catch (e) { failures.push(e.message); } } }));
  if (failures.length) { console.error("\n" + failures.join("\n\n")); process.exit(1); }
  join();
}
