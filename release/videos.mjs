// Builds the guide videos. For every guide chapter, in a light and a dark version, it drives the real app in a
// browser, renders it frame by frame at 4K (the browser's clock is stepped one frame at a time, so every frame is
// sharp and motion is perfectly even), narrates each scene with a natural female voice and writes subtitles.
// Output per chapter: <id>-light.mp4, <id>-dark.mp4, two poster JPGs and <id>.vtt.
// Run by the release build: RELEASE=1 docker compose up -d --build
import { chromium } from "@playwright/test";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { serve } from "./serve.mjs";

const APP = process.env.APP_DIR || "../app";
const OUT = process.env.OUT_DIR || "/out/guide";
const TMP = process.env.TMP_DIR || "/tmp/guide-build";
const PYTHON = process.env.TTS_PYTHON || "/opt/tts/bin/python";
const PORT = 4174, URL_ = "http://127.0.0.1:" + PORT + "/";
const W = 1280, H = 720, SCALE = +(process.env.VIDEO_SCALE || 3), FPS = 30, FRAME = 1000 / FPS, GAP = 0.45; // 1280x720 at 3x = 3840x2160
const THEMES = (process.env.VIDEO_THEMES || "light,dark").split(",");
// Each video is rendered by its own browser; by default they all run at once, spread over every CPU core.
const JOBS = +(process.env.VIDEO_JOBS || Math.max(1, os.cpus().length));

const run = (cmd, args, opts) => execFileSync(cmd, args, Object.assign({ stdio: ["pipe", "pipe", "pipe"], maxBuffer: 1 << 28 }, opts));
const runAsync = promisify(execFile);
const duration = f => parseFloat(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

/* ---------- look: title cards, a soft pointer and a click pulse, drawn over the app while recording ---------- */
const CSS = `
#gtitle{position:fixed;inset:0;z-index:9998;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;pointer-events:none;
  background:radial-gradient(120% 90% at 50% 38%,#1c2742 0%,#0a0f1c 55%,#04060b 100%);opacity:0;transition:opacity .8s ease;font-family:"Inter",system-ui,sans-serif}
#gtitle.light{background:radial-gradient(120% 90% at 50% 38%,#ffffff 0%,#eef1f7 55%,#dfe4ee 100%)}
#gtitle.on{opacity:1}
#gtitle small{font:600 15px/1 "Inter",sans-serif;letter-spacing:.34em;text-transform:uppercase;color:#7f8db0}
#gtitle h1{margin:0;font:600 70px/1.04 "Inter",sans-serif;letter-spacing:-.03em;text-align:center;max-width:1000px;padding-bottom:6px;background:linear-gradient(180deg,#fff 20%,#9fb0d8 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  transform:translateY(14px) scale(.985);opacity:0;transition:transform 1.1s cubic-bezier(.2,.8,.2,1),opacity 1.1s ease}
#gtitle.light h1{background:linear-gradient(180deg,#0b1020 20%,#3b4a70 100%);-webkit-background-clip:text;background-clip:text}
#gtitle p{margin:0;font:400 24px/1.3 "Inter",sans-serif;color:#aeb9d4;opacity:0;transition:opacity 1.2s ease .35s}
#gtitle.light p{color:#55617c}
#gtitle.on h1{transform:none;opacity:1}
#gtitle.on p{opacity:1}
#gcur{position:fixed;left:0;top:0;z-index:9999;width:24px;height:24px;margin:-3px 0 0 -3px;pointer-events:none;filter:drop-shadow(0 3px 5px rgba(0,0,0,.45));transition:opacity .5s}
#gtitle.on~#gcur{opacity:0}
.gpulse{position:fixed;z-index:9997;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:2px solid #4f8dff;pointer-events:none;animation:gpulse .6s ease-out forwards}
@keyframes gpulse{from{transform:scale(.6);opacity:.95}to{transform:scale(4.2);opacity:0}}
`;
const CURSOR = '<svg viewBox="0 0 26 26" width="24" height="24"><path d="M4 3l16 9.2-7.2 1.6L9 21z" fill="#fff" stroke="#0b1020" stroke-width="1.6" stroke-linejoin="round"/></svg>';

/* ---------- chapters: what is said and what happens on screen while it is said ---------- */
const CHAPTERS = [
  { id: "01-read", kicker: "Roadmap Builder", title: "Read the roadmap", panel: false, mode: "view", scenes: [
    { say: "Welcome to Roadmap Builder. It puts your whole programme into one intuitive, interactive view, and this short guide shows you how to read it." },
    { say: "Start by pointing at anything on the chart. A bar, a milestone, or a stage on the critical path will show a small card with its dates and a note.", do: async h => { await h.glide(await h.pt("#b-a4", 0.4)); } },
    { say: "The card stays where it opened, so you can reach it. Pick it up and put it wherever suits you, and it will keep opening there.", do: async h => {
        const b = await h.box("#hover"); await h.dragTo({ x: b.x + 40, y: b.y + 14 }, { x: b.x + 300, y: b.y + 150 }); } },
    { say: "When you want the full story, click the item. A dialog opens with everything that has been written about it.", do: async h => { await h.click("#b-a1", { fx: 0.3 }); await h.wait(1900); await h.click('[data-sheet="close"]'); } },
    { say: "Long programmes run off the screen, so the schedule scrolls on its own. The years and the headings stay in place, so you never lose your bearings.", do: async h => { await h.glide(await h.pt("#r-a9 .track", 0.5)); await h.scroll("#chart", 420, 1400); await h.wait(700); await h.scroll("#chart", -420, 1200); } },
    { say: "As you move across the timeline, a faint line shows the exact date under your pointer. And if the names feel cramped, drag the edge of the activity column to give them more room.", do: async h => {
        await h.sweep(await h.pt("#r-a8 .track", 0.1), await h.pt("#r-a8 .track", 0.72), 3000);
        const p = await h.pt("#colrz"); await h.dragTo(p, { x: p.x + 100, y: p.y }); } },
    { say: "To zoom, drag the year scale and the timeline stretches under your hand. Or right-click a row and fit the timeline to it, so that row fills the middle of the screen.", do: async h => {
        const y = await h.pt(".years", 0.35); await h.dragTo(y, { x: y.x + 150, y: y.y }, 1300); await h.wait(700);
        const r = await h.pt("#r-a11 .aname"); await h.glide(r); await h.pulse(); await h.page.mouse.click(r.x, r.y, { button: "right" }); await h.wait(700);
        await h.click("#ctx button:nth-of-type(2)"); } },
    { say: "If you ever need a reminder, the Help button opens these steps in a window of their own.", do: async h => { await h.glide(await h.pt("#helpBtn")); await h.pulse(); } }
  ] },
  { id: "02-rows", kicker: "Edit mode", title: "Add and edit rows", panel: false, mode: "edit", scenes: [
    { say: "Now let's change the roadmap. You will find that editing happens right where you are looking." },
    { say: "Switch to Edit, and every name and every date becomes a field. Click one and type. There is no save button, your changes are kept as you go.", do: async h => {
        await h.click("#n-a2"); await h.key("End"); await h.type(" (phase one)"); await h.key("Enter"); } },
    { say: "To add an activity, type a name in the highlighted row at the end of a workstream and press Enter. Keep typing to add the next one, much as you would in a list.", do: async h => {
        await h.click("#an-p1"); await h.type("Order more carrots"); await h.key("Enter"); await h.wait(400);
        await h.type("Thank the wombats"); await h.key("Enter"); } },
    { say: "New rows start without dates, because you often know the work before you know the timing. Click the timeline to place one, or give it only a start date and its bar fades out towards the future.", do: async h => {
        const id = n => h.page.evaluate(n => window.__roadmap.state.activities.find(a => a.name === n).id, n);
        await h.click("#pl-" + await id("Order more carrots"), { fx: 0.2 }); await h.wait(1100);
        const w = await id("Thank the wombats"); await h.click("#ds-" + w, { fx: 0.3 }); await h.set("#ds-" + w, "2027-06-01"); } },
    { say: "The chips above the table choose what is written beside each bar. And the eye on each row hides it from View and from exports, while keeping it within reach here in Edit.", do: async h => {
        await h.click("#ey-barName"); await h.wait(1500); await h.click("#ey-colEnd"); await h.wait(1300); await h.click("#ey-colEnd"); } }
  ] },
  { id: "03-settings", kicker: "Edit mode", title: "Properties", panel: true, mode: "edit", cols: false, scenes: [
    { say: "Quick edits happen on the chart. For everything else, there is the Properties panel." },
    { say: "Click a bar, and all of its settings open in the panel on the right, beside the chart rather than on top of it.", do: async h => { await h.click("#b-a2"); await h.wait(500); } },
    { say: "Change a date or pick a new colour, and the chart follows as you type, so you can see the effect straight away.", do: async h => {
        await h.click("#f-end", { fx: 0.3 }); await h.set("#f-end", "2028-10-31"); await h.wait(1100);
        await h.glide(await h.pt("#f-color")); await h.pulse(); await h.set("#f-color", "#f07c1f"); } },
    { say: "The hover card and the details dialog are written here too, in plain text with simple formatting. The preview underneath shows how each will read.", do: async h => { await h.click("#f-hover"); await h.type("**Ready** by spring. Bring a spanner."); } },
    { say: "Further down, you can set the size of the labels and the size of the dates separately, which helps when the roadmap is shown on a big screen.", do: async h => {
        await h.click("#dx-done"); await h.glide(await h.pt("#t-labelScale")); await h.pulse(); await h.set("#t-labelScale", "120"); await h.wait(1200);
        await h.glide(await h.pt("#t-dateScale")); await h.pulse(); await h.set("#t-dateScale", "90"); } },
    { say: "The header has its own settings. Choose a size and a font for the heading, and give the cards tab a name that suits your programme.", do: async h => {
        await h.glide(await h.pt("#t-bannerScale")); await h.pulse(); await h.set("#t-bannerScale", "125"); await h.wait(1000);
        await h.glide(await h.pt("#t-bannerFont")); await h.pulse(); await h.set("#t-bannerFont", "inter"); await h.wait(900);
        await h.click("#r-panelTitle"); await h.key("Control+A"); await h.type("House rules"); } },
    { say: "The date chip in the corner can be switched off altogether, or kept on screen and left out of anything you export.", do: async h => { await h.click("#t-showChip"); await h.wait(1200); await h.click("#t-showChip"); await h.wait(600); await h.click("#t-chipExport"); } },
    { say: "And under Timeline, you set the year the roadmap starts, and how many years it shows.", do: async h => { await h.click("#r-years"); await h.set("#r-years", "6"); await h.wait(1500); await h.set("#r-years", "8"); } },
    { say: "When you want more room for the chart, the Properties button tucks the panel away, and brings it back.", do: async h => { await h.click("#propBtn"); await h.wait(1300); await h.click("#propBtn"); } },
    { say: "You can also work directly on the bars. Drag one to move it, drag an edge to change its length, and if you change your mind, Undo takes you back a step.", do: async h => {
        const c = await h.pt("#b-a3"); await h.dragTo(c, { x: c.x + 60, y: c.y }); await h.wait(600);
        const e = await h.pt("#b-a3", 0.97); await h.dragTo(e, { x: e.x + 50, y: e.y }); await h.wait(600);
        await h.click("#undo"); } }
  ] },
  { id: "04-cards", kicker: "Make it yours", title: "Cards and display", panel: true, mode: "edit", cols: false, scenes: [
    { say: "A roadmap is more than bars. Let's add some notes, and make it look like yours." },
    { say: "Floating cards are notes that sit over the chart. Drag one to wherever it tells the story best.", do: async h => { const p = await h.pt("#fc-f1 .md"); await h.dragTo(p, { x: p.x - 120, y: p.y + 60 }, 1400); } },
    { say: "Each card is pinned to its row. Hide the rows above it and switch to View, and the card moves up with its row, so it still points at the right thing.", do: async h => {
        await h.click("#eh-a3"); await h.click("#eh-a4"); await h.wait(500); await h.click("#modeView"); await h.wait(1600); await h.click("#modeEdit"); } },
    { say: "There is a second kind of card on the right, good for principles or key messages. Open its tab, and edit a title in place.", do: async h => {
        await h.click("#pt-cards"); await h.click("#ce-n-n1-title"); await h.key("Control+A"); await h.type("Tea, always"); await h.key("Enter"); } },
    { say: "Not sure about colours? Randomise colours suggests a fresh, matched set. Press it again for another idea, and flip between light and dark to see how it holds up.", do: async h => {
        await h.click("#pt-props"); await h.click("#randCol"); await h.wait(1500); await h.click("#randCol"); await h.wait(1500);
        await h.click("#flipTheme"); await h.wait(1500); await h.click("#flipTheme"); } },
    { say: "The rest of the look is in Properties as well. Square or rounded corners, a light or a dark theme, and the fonts you prefer.", do: async h => {
        await h.click("#pt-props"); await h.click("#t-roundCards"); await h.wait(1100);
        await h.glide(await h.pt("#t-theme")); await h.pulse(); await h.set("#t-theme", h.theme === "dark" ? "light" : "dark"); await h.wait(1900);
        await h.pulse(); await h.set("#t-theme", "auto"); } }
  ] },
  { id: "05-json", kicker: "For precise changes", title: "JSON and files", panel: false, mode: "edit", cols: false, scenes: [
    { say: "Sometimes it is quicker to edit a plan as text. For that, there is a live JSON editor." },
    { say: "Open it, and it takes the left side of the screen. Every activity is one numbered line, with its start and its end.", do: async h => { await h.click("#jsonBtn"); await h.wait(500); } },
    { say: "Change a date in the text, and the bar on the chart moves as you type. The two are always the same roadmap.", do: async h => {
        await h.glide(await h.pt("#src", 0.6, 0.1)); await h.pulse();
        await h.page.evaluate(() => { const t = document.querySelector("#src"), i = t.value.indexOf("2028-08-31"); t.focus(); t.setSelectionRange(i, i + 10); });
        await h.wait(600); await h.type("2027-03-31", 110); } },
    { say: "Typing mistakes happen. When the text is not valid, nothing is changed, and the message tells you which line to look at.", do: async h => {
        await h.page.evaluate(() => { const t = document.querySelector("#src"), i = t.value.indexOf('"workstreams":[') + 14; t.focus(); t.setSelectionRange(i, i + 1); t.scrollTop = 0; });
        await h.glide(await h.pt("#src", 0.3, 0.06)); await h.pulse(); await h.wait(400); await h.key("Delete"); await h.wait(900); await h.glide(await h.pt("#srcStatus", 0.3)); } },
    { say: "Put it right, press Control S, and the text is laid out neatly again.", do: async h => { await h.type("[", 200); await h.wait(900); await h.key("Control+s"); } },
    { say: "Cards are listed here as well. Retype a title, and the card on the chart updates to match.", do: async h => {
        await h.page.evaluate(() => { const t = document.querySelector("#src"), i = t.value.indexOf('"title":"Wombat Wrangling"') + 9; t.focus(); t.setSelectionRange(i, i + 16); const line = t.value.slice(0, i).split("\n").length; t.scrollTop = Math.max(0, line * 17 - t.clientHeight / 2); t.scrollLeft = 0; });
        await h.glide(await h.pt("#src", 0.5, 0.5)); await h.pulse(); await h.wait(500); await h.type("Wombat herding", 90); } },
    { say: "When you are ready to share, Export offers a roadmap file to keep, a standalone page, a view-only page, an image of what is on screen, or a PDF.", do: async h => { await h.click("#exBtn"); await h.wait(1900); await h.key("Escape"); } },
    { say: "That is Roadmap Builder. Plan it, see it, and share it.", do: async h => { await h.title("Roadmap Builder", "Plan it. See it. Share it.", ""); } }
  ] }
];

/* ---------- helpers handed to each scene. All waiting goes through wait(), which renders the frames. ---------- */
function helpers(page, theme, wait) {
  let cur = { x: W / 2, y: H / 2 };
  const setCur = (x, y, ms) => page.evaluate(([x, y, ms]) => { const c = document.getElementById("gcur"); c.style.transition = (ms ? "transform " + ms + "ms cubic-bezier(.35,.05,.2,1)," : "") + "opacity .5s"; c.style.transform = "translate(" + x + "px," + y + "px)"; }, [x, y, ms]);
  const h = {
    page, theme, wait,
    async box(sel) {
      const b = await page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, sel);
      if (!b || !b.width) {
        const why = await page.evaluate(sel => ({ found: !!document.querySelector(sel), bars: document.querySelectorAll(".bar").length, rows: document.querySelectorAll(".row").length, body: document.body.className, box: JSON.stringify(document.querySelector(sel) && document.querySelector(sel).getBoundingClientRect()) }), sel);
        await page.screenshot({ path: path.join(TMP, "debug.jpg"), type: "jpeg", quality: 60, scale: "css" }).catch(() => {});
        throw new Error("Nothing on screen matches " + sel + " " + JSON.stringify(why));
      }
      return b;
    },
    async pt(sel, fx = 0.5, fy = 0.5) {
      await h.box(sel);
      await h.reveal(sel);
      const b = await h.box(sel);
      return { x: b.x + b.width * fx, y: b.y + b.height * fy };
    },
    // Bring something into view by scrolling whatever it sits in: the schedule or a side panel. The page itself does
    // not scroll. Scrolling is stepped with timers so that it follows the stepped clock.
    async reveal(sel) {
      const moved = await page.evaluate(([sel, ms]) => {
        const el = document.querySelector(sel); if (!el || el.closest(".hrow,.tools,#ctx,#hover,#sheet,#toast,.menu")) return false;
        let sc = el.parentElement; while (sc && !(sc.scrollHeight > sc.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
        if (!sc) return false;
        const r = el.getBoundingClientRect(), c = sc.getBoundingClientRect(), head = sc.id === "chart" ? sc.querySelector(".hrow").offsetHeight : 44;
        if (r.top >= c.top + head + 4 && r.bottom <= c.bottom - 18) return false;
        const dy = r.top + r.height / 2 - (c.top + head + (c.height - head) / 2), y0 = sc.scrollTop, t0 = Date.now();
        const id = setInterval(() => { const t = Math.min(1, (Date.now() - t0) / ms), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; sc.scrollTop = y0 + dy * e; if (t >= 1) clearInterval(id); }, 8);
        return true;
      }, [sel, 650]);
      if (moved) await wait(800);
    },
    async scroll(sel, dy, ms = 900) {
      await page.evaluate(([sel, dy, ms]) => { const sc = document.querySelector(sel), y0 = sc.scrollTop, t0 = Date.now(), id = setInterval(() => { const t = Math.min(1, (Date.now() - t0) / ms), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; sc.scrollTop = y0 + dy * e; if (t >= 1) clearInterval(id); }, 8); }, [sel, dy, ms]);
      await wait(ms + 150);
    },
    async glide(p, ms) {
      ms = ms || Math.min(950, 400 + Math.hypot(p.x - cur.x, p.y - cur.y) * 0.9);
      await setCur(p.x, p.y, ms); await wait(ms);
      await page.mouse.move(p.x, p.y, { steps: 4 }); cur = p; await wait(130);
    },
    async pulse() { await page.evaluate(([x, y]) => { const d = document.createElement("div"); d.className = "gpulse"; d.style.left = x + "px"; d.style.top = y + "px"; document.body.appendChild(d); setTimeout(() => d.remove(), 700); }, [cur.x, cur.y]); },
    async click(sel, o = {}) { await h.glide(await h.pt(sel, o.fx, o.fy)); await h.pulse(); await page.mouse.down(); await wait(70); await page.mouse.up(); await wait(300); },
    async key(k) { await page.keyboard.press(k); await wait(90); },
    async type(text, delay = 55) { for (const c of text) { await page.keyboard.type(c); await wait(delay); } },
    // Set a field the way a person's edit would, without a native picker.
    async set(sel, value) { await page.evaluate(([sel, value]) => { const el = document.querySelector(sel); el.value = value; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }, [sel, value]); await wait(60); },
    async sweep(from, to, ms = 1500, held = false) {
      await h.glide(from);
      if (held) { await h.pulse(); await page.mouse.down(); await wait(130); }
      const n = Math.max(8, Math.round(ms / FRAME));
      for (let i = 1; i <= n; i++) { const t = i / n, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e;
        await setCur(x, y, 0); await page.mouse.move(x, y); await wait(FRAME); }
      if (held) { await wait(130); await page.mouse.up(); }
      cur = to; await wait(220);
    },
    dragTo: (from, to, ms = 1100) => h.sweep(from, to, ms, true),
    async title(big, small, kicker, instant) {
      await page.evaluate(([b, s, k, instant, light]) => { const t = document.getElementById("gtitle"); t.classList.toggle("light", light); t.querySelector("h1").textContent = b; t.querySelector("p").textContent = s || ""; t.querySelector("small").textContent = k || "";
        if (instant) { t.style.transition = "none"; t.classList.add("on"); void t.offsetWidth; t.style.transition = ""; } else t.classList.add("on"); }, [big, small, kicker, !!instant, theme === "light"]);
    },
    async titleOff() { await page.evaluate(() => document.getElementById("gtitle").classList.remove("on")); await wait(900); }
  };
  return h;
}

/* ---------- subtitles ---------- */
const stamp = t => { const ms = Math.max(0, Math.round(t * 1000)), p = (n, l) => String(n).padStart(l, "0"); return p(Math.floor(ms / 3600000), 2) + ":" + p(Math.floor(ms / 60000) % 60, 2) + ":" + p(Math.floor(ms / 1000) % 60, 2) + "." + p(ms % 1000, 3); };
function chunks(text) {
  const out = [];
  text.match(/[^.!?]+[.!?]+|[^.!?]+$/g).map(s => s.trim()).filter(Boolean).forEach(s => {
    if (s.length <= 64) { out.push(s); return; }
    let line = "";
    s.split(/(?<=,)\s+|\s+(?=and |so |or )/).forEach(part => { if (line && (line + " " + part).length > 64) { out.push(line); line = part; } else line = line ? line + " " + part : part; });
    if (line) out.push(line);
  });
  return out;
}
function cues(marks) {
  const out = [];
  marks.forEach(m => { const parts = chunks(m.text), total = parts.reduce((a, p) => a + p.length, 0); let t = m.start;
    parts.forEach(p => { const d = m.dur * p.length / total; out.push([+(t + 0.05).toFixed(3), +(t + d).toFixed(3), p]); t += d; }); });
  return out;
}
const vtt = list => "WEBVTT\n\n" + list.map((c, i) => (i + 1) + "\n" + stamp(c[0]) + " --> " + stamp(c[1]) + " line:88% align:center\n" + c[2] + "\n\n").join("");
// The same subtitles as a script: a page opened straight from a folder is not allowed to read the .vtt file.
const subsJs = (id, list) => '(window.GUIDE_SUBS=window.GUIDE_SUBS||{})[' + JSON.stringify(id) + ']=' + JSON.stringify(list) + ';\n';

/* ---------- build one chapter in one theme ---------- */
async function build(ch, theme) {
  const name = ch.id + "-" + theme, dir = path.join(TMP, name); fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--font-render-hinting=none"] });
  try {
    const context = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: theme });
    const page = await context.newPage();
    const problems = []; page.on("pageerror", e => problems.push(String(e)));
    await page.goto(URL_);
    await page.addStyleTag({ content: CSS });
    await page.evaluate(cursor => { const t = document.createElement("div"); t.id = "gtitle"; t.innerHTML = "<small></small><h1></h1><p></p>"; document.body.appendChild(t);
      const c = document.createElement("div"); c.id = "gcur"; c.innerHTML = cursor; c.style.transform = "translate(" + innerWidth / 2 + "px," + innerHeight / 2 + "px)"; document.body.appendChild(c); }, CURSOR);
    // Set the stage behind the title card, in real time.
    if (!ch.panel) await page.click("#propBtn");
    await page.click(ch.mode === "edit" ? "#modeEdit" : "#modeView");
    // Clicked from inside the page: a real click would make the browser scroll the schedule sideways to "reach" a pinned heading.
    if (ch.cols === false) await page.evaluate(() => { document.querySelector("#ey-colStart").click(); document.querySelector("#ey-colEnd").click(); });
    await page.evaluate(() => { document.querySelector("#toast").hidden = true; const c = document.querySelector("#chart"); c.scrollLeft = 0; c.scrollTop = 0; });
    await page.mouse.move(W / 2, H / 2);
    await document_fonts(page);
    await page.waitForTimeout(900);

    // From here the page only moves when we step it, one frame at a time: its timers run on a clock we advance,
    // and every CSS transition and animation is paused and moved forward by exactly one frame before each picture.
    const cdp = await context.newCDPSession(page), t0 = Date.now();
    await page.clock.install({ time: t0 });
    await page.clock.pauseAt(t0 + 200);
    let clock = 0, due = 0, frames = 0, top = 0;
    const step = async () => {
      await page.clock.runFor(FRAME);
      top = await page.evaluate(ms => { for (const a of document.getAnimations()) { if (a.playState !== "paused") a.pause(); const t = (a.currentTime || 0) + ms, end = a.effect ? a.effect.getComputedTiming().endTime : Infinity; if (t >= end) a.finish(); else a.currentTime = t; } return scrollY; }, FRAME);
    };
    const shot = async () => { const r = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 94, optimizeForSpeed: true, clip: { x: 0, y: top, width: W, height: H, scale: SCALE } }); await fs.promises.writeFile(path.join(dir, "f" + String(frames++).padStart(5, "0") + ".jpg"), Buffer.from(r.data, "base64")); };
    const wait = async ms => { due += ms; while (clock + FRAME / 2 < due) { await step(); clock += FRAME; await shot(); } };
    const h = helpers(page, theme, wait);
    await h.title(ch.title, "", ch.kicker, true);
    await wait(300);

    const marks = [];
    for (let i = 0; i < ch.scenes.length; i++) {
      const s = ch.scenes[i], start = clock / 1000 + 0.25;
      marks.push({ start, dur: ch.clips[i].dur, text: s.say, file: ch.clips[i].file });
      if (s.do) await s.do(h);
      const left = (start + ch.clips[i].dur + GAP) * 1000 - clock;
      if (left > 0) await wait(left);
      if (i === 0) await h.titleOff();
    }
    await wait(800);
    if (problems.length) throw new Error(name + ": the app reported errors while recording: " + problems.join("; "));
    await context.close();

    const total = frames / FPS, mp4 = path.join(OUT, name + ".mp4"), args = ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "f%05d.jpg")];
    marks.forEach(m => args.push("-i", m.file));
    // Narration: each line on its cue, then a light mastering chain (rumble filter, gentle compression, broadcast loudness).
    const audio = marks.map((m, i) => "[" + (i + 1) + ":a]aresample=48000,afade=t=in:d=0.02,adelay=" + Math.round(m.start * 1000) + ":all=1[a" + i + "]").join(";");
    const filter = "[0:v]format=yuv420p,fade=t=in:st=0:d=0.5,fade=t=out:st=" + (total - 0.6).toFixed(2) + ":d=0.6[v];" + audio + ";" + marks.map((m, i) => "[a" + i + "]").join("") +
      "amix=inputs=" + marks.length + ":normalize=0,highpass=f=70,acompressor=threshold=-21dB:ratio=2.5:attack=8:release=160:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=9,aresample=48000,apad[a]";
    args.push("-filter_complex", filter, "-map", "[v]", "-map", "[a]", "-t", total.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-tune", "animation", "-g", "60",
      "-c:a", "aac", "-b:a", "192k", "-ac", "2", "-movflags", "+faststart", mp4);
    await runAsync("ffmpeg", args, { maxBuffer: 1 << 28 });
    const list = cues(marks);
    fs.writeFileSync(path.join(OUT, ch.id + ".vtt"), vtt(list));
    fs.writeFileSync(path.join(OUT, ch.id + ".subs.js"), subsJs(ch.id, list));
    const still = ch.scenes.length > 2 ? marks[2].start - 0.3 : total / 2;
    await runAsync("ffmpeg", ["-y", "-loglevel", "error", "-ss", still.toFixed(2), "-i", mp4, "-frames:v", "1", "-vf", "scale=1920:-2", "-q:v", "3", path.join(OUT, name + ".jpg")]);
    fs.rmSync(dir, { recursive: true, force: true });

    const info = run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height", "-of", "csv=p=0", mp4]).toString().trim().split(/\s+/).sort().join(" ");
    if (info !== "audio video," + W * SCALE + "," + H * SCALE) throw new Error(name + ".mp4 should have one audio stream and one " + W * SCALE + "x" + H * SCALE + " video stream, found: " + info);
    console.log(name + ".mp4  " + W * SCALE + "x" + H * SCALE + "  " + total.toFixed(1) + "s  " + (fs.statSync(mp4).size / 1048576).toFixed(1) + " MB  " + marks.length + " narrated scenes");
  } finally { await browser.close(); }
}
const document_fonts = page => page.evaluate(() => document.fonts.ready.then(() => Promise.all(["600 70px Inter", "400 24px Inter"].map(f => document.fonts.load(f)))));

/* ---------- main ---------- */
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
const only = process.argv[2];
const chapters = CHAPTERS.filter(c => !only || c.id === only);

// "JSON" is spelt "Jayson" for the voice only; the subtitles keep "JSON".
// Narration first, in one go: the same recordings serve the light and the dark version.
const manifest = [];
chapters.forEach(ch => { ch.clips = ch.scenes.map((s, i) => { const file = path.join(TMP, ch.id + "-say-" + i + ".wav"); manifest.push({ text: s.say.replace(/\bJSON\b/g, "Jayson"), file }); return { file }; }); });
fs.writeFileSync(path.join(TMP, "say.json"), JSON.stringify(manifest));
process.stdout.write(run(PYTHON, [new URL("./speak.py", import.meta.url).pathname, path.join(TMP, "say.json")]).toString());
chapters.forEach(ch => ch.clips.forEach(c => { c.dur = duration(c.file); }));

const server = await serve(APP, PORT);
const queue = [];
chapters.forEach(ch => THEMES.forEach(theme => queue.push([ch, theme])));
console.log("Rendering " + queue.length + " videos at " + W * SCALE + "x" + H * SCALE + ", " + JOBS + " at a time");
try { await Promise.all(Array.from({ length: JOBS }, async () => { for (let job; (job = queue.shift());) await build(job[0], job[1]); })); }
finally { server.close(); }
