// Browser tests for Roadmap Builder. Run by the release build: RELEASE=1 docker compose up -d --build
import { test, expect } from "@playwright/test";

const errors = new WeakMap();
const state = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__roadmap.state)));
const act = async (page, id) => (await state(page)).activities.find(a => a.id === id);

async function open(page, mode) {
  await page.goto("/");
  await expect(page.locator("#inner .row").first()).toBeVisible();
  if (mode === "edit") await page.click("#modeEdit");
  await settle(page);
}
// Bars and columns glide to their new place; wait for that before measuring or dragging.
const settle = page => page.waitForTimeout(450);
async function dragBy(page, selector, dx, dy = 0) {
  const b = await page.locator(selector).boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  const list = [];
  errors.set(page, list);
  page.on("pageerror", e => list.push(String(e)));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) list.push(m.text()); });
});
test.afterEach(async ({ page }) => { expect(errors.get(page), "errors in the browser console").toEqual([]); });

test("the sample roadmap loads in View mode", async ({ page }) => {
  await open(page);
  await expect(page.locator("#inner .row")).toHaveCount(43);
  await expect(page.locator("#title")).toContainText("Project Wombat");
  await expect(page.locator("#inner .eye")).toHaveCount(0);
  expect((await state(page)).activities).toHaveLength(36);
});

test("headings are not in capitals and cards are square by default; Rounded cards rounds them", async ({ page }) => {
  await open(page);
  await expect(page.locator(".gname").first()).toHaveCSS("text-transform", "none");
  await expect(page.locator(".fcard").first()).toHaveCSS("border-top-left-radius", "0px");
  await expect(page.locator(".pcard").first()).toHaveCSS("border-top-left-radius", "0px");
  await page.check("#t-roundCards");
  await expect(page.locator(".fcard").first()).toHaveCSS("border-top-left-radius", "8px");
  await expect(page.locator(".pcard").first()).toHaveCSS("border-top-left-radius", "8px");
  // The dialog keeps its accent strip square: only its bottom corners round.
  await expect(page.locator("#card")).toHaveCSS("border-top-left-radius", "0px");
  await expect(page.locator("#card")).toHaveCSS("border-top-right-radius", "0px");
  await expect(page.locator("#card")).toHaveCSS("border-bottom-left-radius", "10px");
});

test("the add row creates activities without dates, and a click on the timeline places one", async ({ page }) => {
  await open(page, "edit");
  await page.click("#an-p1");
  await page.keyboard.type("Alpha");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Beta");
  await page.keyboard.press("Enter");
  const s = await state(page);
  expect(s.activities).toHaveLength(38);
  const alpha = s.activities.find(a => a.name === "Alpha");
  expect(alpha).toMatchObject({ phase: "p1", start: "", end: "", type: "bar" });
  expect(s.activities.some(a => a.name === "Beta")).toBe(true);
  await expect(page.locator("#an-p1")).toBeFocused();
  await page.locator("#pl-" + alpha.id).click({ position: { x: 120, y: 8 } });
  const placed = await act(page, alpha.id);
  expect(placed.start).toMatch(/^\d{4}-\d{2}-01$/);
  expect(placed.end > placed.start).toBe(true);
  await expect(page.locator("#b-" + alpha.id)).toBeVisible();
});

test("the last add row creates a workstream", async ({ page }) => {
  await open(page, "edit");
  await page.fill("#an-new", "Gamma stream");
  await page.keyboard.press("Enter");
  const s = await state(page);
  expect(s.phases).toHaveLength(8);
  expect(s.phases[7].name).toBe("Gamma stream");
});

test("dates are edited in the columns, and a bar with one date fades", async ({ page }) => {
  await open(page, "edit");
  await page.fill("#ds-a2", "2026-09-01");
  expect((await act(page, "a2")).start).toBe("2026-09-01");
  await page.fill("#de-a2", "");
  expect((await act(page, "a2")).end).toBe("");
  await expect(page.locator("#b-a2")).toHaveClass(/fout/);
  await page.fill("#ds-a2", "");
  await expect(page.locator("#pl-a2")).toBeVisible();
  await page.fill("#de-a2", "2027-06-30");
  await expect(page.locator("#b-a2")).toHaveClass(/fin/);
});

test("a hidden activity is dimmed in Edit mode and absent in View mode", async ({ page }) => {
  await open(page, "edit");
  await page.click("#eh-a3");
  await expect(page.locator("#r-a3")).toHaveClass(/ghost/);
  await page.click("#modeView");
  await expect(page.locator("#r-a3")).toHaveCount(0);
  await expect(page.locator("#inner .row")).toHaveCount(42);
});

test("headings are edited in place", async ({ page }) => {
  await open(page, "edit");
  await page.click("#ce-s-lblStart");
  await page.keyboard.press("Control+A");
  await page.keyboard.type("Begins");
  await page.keyboard.press("Enter");
  expect((await state(page)).settings.lblStart).toBe("Begins");
  await page.click("#ce-f-f1-title");
  await page.keyboard.press("Control+A");
  await page.keyboard.type("Renamed card");
  await page.keyboard.press("Enter");
  expect((await state(page)).cards[0].title).toBe("Renamed card");
});

test("an item's settings open in the Properties panel and typing keeps the caret", async ({ page }) => {
  await open(page, "edit");
  await page.click("#pe-a2");
  await expect(page.locator("#propsItem #istrip")).toBeVisible();
  await expect(page.locator("#inner #istrip")).toHaveCount(0);
  await page.click("#f-name");
  await page.keyboard.press("End");
  await page.keyboard.type(" XY");
  await expect(page.locator("#f-name")).toBeFocused();
  await expect(page.locator("#n-a2")).toHaveValue(/ XY$/);
  expect((await act(page, "a2")).name).toMatch(/ XY$/);
  await page.click("#dx-done");
  await expect(page.locator("#istrip")).toHaveCount(0);
});

test("the chips choose what is written beside each bar", async ({ page }) => {
  await open(page, "edit");
  await expect(page.locator("#ey-barStart")).toHaveClass(/on/);
  await expect(page.locator("#ey-barName")).not.toHaveClass(/on/);
  await page.click("#ey-barName");
  await expect(page.locator("#ey-barName")).toHaveClass(/on/);
  await expect(page.locator("#r-a1 .blabel")).toContainText("Herd the initial wombats");
  await page.click("#ey-barStart");
  await page.click("#ey-barEnd");
  await expect(page.locator("#r-a1 .blabel")).toHaveText("Herd the initial wombats (Shed A)");
});

test("the Start and End columns can be hidden and shown", async ({ page }) => {
  await open(page, "edit");
  await expect(page.locator("#ds-a1")).toBeVisible();
  // In Edit mode a hidden column keeps its place, dimmed, so no control moves and its dates can still be typed.
  const spots = () => page.evaluate(() => ["#ey-colStart", "#ey-colEnd", "#eh-a1", "#pe-a1", "#de-a1"].map(q => Math.round(document.querySelector(q).getBoundingClientRect().left)));
  const before = await spots();
  await page.click("#ey-colStart");
  await settle(page);
  await expect(page.locator("#ds-a1")).toBeVisible();
  await expect(page.locator("#ey-colStart")).toHaveClass(/shut/);
  await expect(page.locator("#chart")).toHaveClass(/nos/);
  expect(await spots()).toEqual(before);
  // In View mode the column is gone.
  await page.click("#modeView");
  await expect(page.locator("#r-a1 .dcol.s")).toHaveCount(0);
  await expect(page.locator("#r-a1 .dcol.e")).toHaveCount(1);
  await page.click("#modeEdit");
  await page.click("#ey-colStart");
  await expect(page.locator("#ey-colStart")).not.toHaveClass(/shut/);
  await expect(page.locator("#chart")).not.toHaveClass(/nos/);
});

test("the eye on a row stays where it is when the row is hidden", async ({ page }) => {
  await open(page, "edit");
  const box = async () => { const b = await page.locator("#eh-a1").boundingBox(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width)]; };
  const before = await box();
  await page.click("#eh-a1");
  await expect(page.locator("#eh-a1")).toHaveClass(/shut/);
  await expect(page.locator("#eh-a1")).toHaveAttribute("aria-pressed", "false");
  expect(await box()).toEqual(before);
  expect((await act(page, "a1")).hidden).toBe(true);
});

test("floating cards that are switched off stay reachable in Edit mode", async ({ page }) => {
  await open(page, "edit");
  const n = await page.locator("#inner .fcard").count();
  expect(n).toBeGreaterThan(0);
  await page.uncheck("#t-showCards");
  await expect(page.locator("#inner .fcards")).toHaveClass(/ghost/);
  await expect(page.locator("#inner .fcard")).toHaveCount(n);
  await page.click("#modeView");
  await expect(page.locator("#inner .fcard")).toHaveCount(0);
});

test("row height and bar thickness can be changed", async ({ page }) => {
  await open(page, "edit");
  const size = async q => { const b = await page.locator(q).boundingBox(); return Math.round(b.height); };
  expect(await size("#r-a1")).toBe(30);
  expect(await size("#b-a1")).toBe(18);
  await page.selectOption("#t-rowH", "48");
  await settle(page);
  expect(await size("#r-a1")).toBe(48);
  expect(await size("#b-a1")).toBe(29);
  await page.selectOption("#t-barFill", "80");
  await settle(page);
  expect(await size("#b-a1")).toBe(38);
  await page.selectOption("#t-rowH", "24");
  await settle(page);
  expect(await size("#r-a1")).toBe(24);
  const st = (await state(page)).settings;
  expect([st.rowH, st.barFill]).toEqual([24, 80]);
  // The bar stays in the middle of its row.
  const r = await page.locator("#r-a1").boundingBox(), b = await page.locator("#b-a1").boundingBox();
  expect(Math.abs((r.y + r.height / 2) - (b.y + b.height / 2))).toBeLessThanOrEqual(1);
});

test("the version is shown at the end of the toolbar", async ({ page }) => {
  await open(page);
  await expect(page.locator("#ver")).toHaveText(/^v\d+\.\d+\.\d+$/);
  expect(await page.locator("#ver").textContent()).toBe("v" + await page.evaluate(() => window.__roadmap.version));
});

test("the JSON editor applies valid edits live and refuses invalid ones", async ({ page }) => {
  await open(page, "edit");
  await page.click("#jsonBtn");
  await expect(page.locator("#jsonPanel")).toBeVisible();
  const text = await page.inputValue("#src");
  expect(text).toContain('"workstreams"');
  expect(text).toContain('{"id":"a1","name":"Herd the initial wombats (Shed A)"');
  const before = await act(page, "a1");
  await page.fill("#src", text.replace('"end":"' + before.end + '"', '"end":"2027-12-31"'));
  await expect(page.locator("#srcStatus")).toContainText("Valid");
  expect((await act(page, "a1")).end).toBe("2027-12-31");
  expect((await act(page, "a1")).hover).toBe(before.hover);
  await page.fill("#src", '{"workstreams":[{"name":"X","activities":[{"name":"bad","start":"2026-13-01"}]}]}');
  await expect(page.locator("#srcStatus")).toContainText("Not applied");
  expect((await state(page)).activities).toHaveLength(36);
});

test("the activity column is resized by dragging its edge", async ({ page }) => {
  await open(page);
  const w0 = (await page.locator(".corner").boundingBox()).width;
  await dragBy(page, "#colrz", 90);
  const w1 = (await page.locator(".corner").boundingBox()).width;
  expect(Math.round(w1 - w0)).toBeGreaterThan(70);
  expect((await state(page)).settings.nameW).toBeGreaterThan(0);
  await page.dblclick("#colrz");
  expect((await state(page)).settings.nameW).toBe(0);
});

test("the hover card can be dragged to a new place and reset", async ({ page }) => {
  await open(page);
  await page.hover("#b-a4");
  const card = page.locator("#hover");
  await expect(card).toBeVisible();
  await expect(card).toContainText("spreadsheet");
  const b0 = await card.boundingBox();
  await page.mouse.move(b0.x + 30, b0.y + 12, { steps: 4 });
  await page.mouse.down();
  await page.mouse.move(b0.x + 330, b0.y + 162, { steps: 8 });
  await page.mouse.up();
  const b1 = await card.boundingBox();
  expect(Math.round(b1.x - b0.x)).toBe(300);
  await expect(page.locator("#tipReset")).toBeVisible();
  await page.hover("#cp-c2");
  const b2 = await card.boundingBox();
  expect(Math.round(b2.x)).toBe(Math.round(b1.x));
  await page.mouse.move(b2.x + 20, b2.y + 10, { steps: 4 });
  await page.click("#tipReset");
  await expect(card).toBeHidden();
});

test("a faint line follows the pointer across the timeline", async ({ page }) => {
  await open(page);
  const t = await page.locator("#r-a1 .track").boundingBox();
  await page.mouse.move(t.x + 200, t.y + 10);
  await expect(page.locator("#xline")).toBeVisible();
  await expect(page.locator("#xline span")).toHaveText(/^\d{2} \w{3} \d{4}$/);
  const n = await page.locator("#r-a1 .rleft").boundingBox();
  await page.mouse.move(n.x + 40, n.y + 10);
  await expect(page.locator("#xline")).toBeHidden();
});

test("the right-click menu offers actions for what is under the pointer", async ({ page }) => {
  await open(page);
  await page.locator("#r-a1 .track").click({ button: "right", position: { x: 300, y: 10 } });
  await expect(page.locator("#ctx")).toBeVisible();
  await expect(page.locator("#ctx")).toContainText("Show details");
  await expect(page.locator("#ctx")).toContainText("Zoom in");
  await expect(page.locator("#ctx")).not.toContainText("Delete");
  await page.keyboard.press("Escape");
  await expect(page.locator("#ctx")).toBeHidden();
  await page.click("#modeEdit");
  await settle(page);
  await page.locator("#b-a2").click({ button: "right" });
  await page.locator("#ctx button", { hasText: "Make it a milestone" }).click();
  expect((await act(page, "a2")).type).toBe("milestone");
  await page.locator("#r-a5 .track").click({ button: "right", position: { x: 20, y: 10 } });
  await page.locator("#ctx button", { hasText: "Add a key milestone" }).click();
  expect((await state(page)).milestones).toHaveLength(7);
  await page.locator("#g-p2 .gname, #g-p2 .rleft").first().click({ button: "right", position: { x: 6, y: 6 } });
  await expect(page.locator("#ctx")).toContainText("Move down");
});

test("bars are moved by dragging and Undo restores them", async ({ page }) => {
  await open(page, "edit");
  const before = await act(page, "a3");
  await dragBy(page, "#b-a3", 80);
  const after = await act(page, "a3");
  expect(after.start > before.start).toBe(true);
  await page.click("#undo");
  expect((await act(page, "a3")).start).toBe(before.start);
});

test("delete shows an Undo and Undo brings the row back", async ({ page }) => {
  await open(page, "edit");
  await page.click("#dl-a1");
  expect((await state(page)).activities).toHaveLength(35);
  await page.click("#toastUndo");
  expect((await state(page)).activities).toHaveLength(36);
});

test("CSV export and import round-trip the activities", async ({ page }) => {
  await open(page);
  const csv = await page.evaluate(() => window.__roadmap.toCSV());
  expect(csv).toContain("Herd the initial wombats (Shed A)");
  await page.evaluate(c => window.__roadmap.importText("roundtrip.csv", c), csv);
  const s = await state(page);
  expect(s.activities).toHaveLength(36);
  expect(s.milestones).toHaveLength(6);
  expect(s.critical).toHaveLength(7);
});

test("an older roadmap file is brought up to date on import", async ({ page }) => {
  await open(page);
  const old = { version: 2, title: "Old", phases: [{ id: "p", name: "P" }], settings: { upper: true, showLabels: false },
    activities: [{ phase: "p", name: "A", start: "2026-01-01", end: "2026-03-31" }, { phase: "p", name: "No dates" }] };
  await page.evaluate(d => window.__roadmap.importText("old.json", JSON.stringify(d)), old);
  const s = await state(page);
  expect(s.version).toBe(4);
  expect([s.settings.fontHead, s.settings.fontBody]).toEqual(["opensans", "opensans"]);
  expect(s.settings.upper).toBe(false);
  expect(s.settings.barStart).toBe(false);
  expect(s.activities.map(a => a.start)).toEqual(["2026-01-01", ""]);
});

test("Guide opens a large dialog at the top, with the steps for every chapter and videos in the app's theme", async ({ page }) => {
  await open(page);
  await expect(page.locator("#pt-props")).toHaveText("Properties");
  // The Guide button is the last one on the toolbar, after the light / dark switch.
  expect(await page.evaluate(() => [...document.querySelectorAll(".tools button")].filter(b => !b.closest(".menu") && b.offsetParent).slice(-2).map(b => b.id))).toEqual(["themeBtn", "helpBtn"]);
  await page.click("#helpBtn");
  const g = page.locator("#card.guide");
  await expect(g.locator("h2")).toContainText("Guide");
  await expect(g.locator(".gstep")).toHaveCount(5);
  await expect(g.locator(".gstep ol li").first()).toBeVisible();
  await expect(g.locator("#helpTake")).toContainText("Download the offline copy");
  // The dialog pops in with a short animation, so wait for it to come to rest before measuring.
  await expect.poll(async () => (await g.boundingBox()).y).toBeLessThan(30);        // at the top of the window
  await expect.poll(async () => (await g.boundingBox()).width).toBeGreaterThan(1000); // and big
  // The videos are rendered later in the release build; where they exist each chapter has one, in the app's theme.
  const has = await g.locator(".gstep video").count();
  if (has) {
    await expect(g.locator(".gstep video")).toHaveCount(5);
    await expect(g.locator('.gstep video track[kind="subtitles"]')).toHaveCount(5);
    expect(await g.locator(".gstep video source").first().getAttribute("src")).toContain("-light.mp4");
  }
  await page.keyboard.press("Escape");
  await expect(page.locator("#sheet")).toBeHidden();
  if (has) {
    await page.click("#themeBtn");
    await page.click("#helpBtn");
    expect(await g.locator(".gstep video source").first().getAttribute("src")).toContain("-dark.mp4");
  }
});

test("the toolbar switches between light and dark", async ({ page }) => {
  await open(page);
  const theme = () => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  await expect(page.locator("#themeBtn")).toContainText("Dark");
  await page.click("#themeBtn");
  expect(await theme()).toBe("dark");
  await expect(page.locator("#themeBtn")).toContainText("Light");
  expect((await state(page)).settings.theme).toBe("dark");
  await page.click("#themeBtn");
  expect(await theme()).toBe("light");
});

test("the app is installable: it has a manifest, an icon and an offline helper", async ({ page, request }) => {
  await open(page);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "manifest.webmanifest");
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("./");
  expect((await request.get("/icon.svg")).ok()).toBe(true);
  expect(await page.evaluate(() => navigator.serviceWorker.ready.then(r => !!r.active))).toBe(true);
});

test("the app works when opened straight from a folder", async ({ page }) => {
  await page.goto(new URL("../../app/index.html", import.meta.url).href);
  await expect(page.locator("#inner .row")).toHaveCount(43);
  await page.click("#modeEdit");
  await page.click("#an-p1");
  await page.keyboard.type("From a folder");
  await page.keyboard.press("Enter");
  expect((await state(page)).activities).toHaveLength(37);
  await page.click("#helpBtn");
  await expect(page.locator("#card.guide .gstep")).toHaveCount(5);
  await expect(page.locator("#helpTake")).toContainText("Download the offline copy");
});

test("Export > Standalone page makes one self-contained file that opens from a folder", async ({ page, context }, info) => {
  await open(page, "edit");
  await page.fill("#an-p1", "Only in the export");
  await page.keyboard.press("Enter");
  await page.click("#exBtn");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click('[data-act="exHtml"]')]);
  expect(download.suggestedFilename()).toMatch(/\.html$/);
  const file = info.outputPath("standalone.html");
  await download.saveAs(file);
  const text = (await import("node:fs")).readFileSync(file, "utf8");
  expect(text.length).toBeGreaterThan(400000);
  expect(text.length).toBeLessThan(3000000);
  expect(text.replace(/<script[^>]*>[\s\S]*?<\/script>/g, "")).not.toMatch(/<(script|link|img)[^>]+(src|href)="(?!data:)/);
  expect(text).not.toMatch(/@@ROADMAP_(TITLE|FONTS|DATA)@@/);

  const copy = await context.newPage(), problems = [];
  copy.on("pageerror", e => problems.push(String(e)));
  copy.on("console", m => { if (m.type() === "error") problems.push(m.text()); });
  await copy.goto("file://" + file);
  await expect(copy.locator("#inner .row")).toHaveCount(44);
  await expect(copy.locator("#title")).toContainText("Project Wombat");
  await expect(copy.locator(".aname", { hasText: "Only in the export" })).toBeVisible();
  await expect(copy.locator("#modeView")).toHaveClass(/on/);
  await expect(copy.locator(".gname").first()).toHaveCSS("font-family", /Open Sans/);
  expect(await copy.evaluate(() => document.fonts.check('600 14px "Open Sans"'))).toBe(true);
  await copy.click("#exBtn");
  await expect(copy.locator('[data-act="exHtml"]')).toBeHidden();
  await expect(copy.locator("#helpBtn")).toBeHidden();
  await expect(copy.locator("#pt-props")).toBeVisible();
  expect(problems).toEqual([]);
});

test("the product film headline stays hidden where the film is not published", async ({ page }) => {
  await open(page);
  await expect(page.locator("#tourBar")).toBeHidden();
  await expect(page.locator("#tourBtn")).toBeHidden();
});

test("the schedule fills the window and scrolls inside itself; the side panels are full height", async ({ page }) => {
  await open(page, "edit");
  const size = page.viewportSize();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(size.height);
  const chart = await page.evaluate(() => { const c = document.querySelector("#chart"); return { scrollsDown: c.scrollHeight > c.clientHeight, head: getComputedStyle(document.querySelector(".hrow")).position }; });
  expect(chart.scrollsDown).toBe(true);
  expect(chart.head).toBe("sticky");
  expect((await page.locator("#panel").boundingBox()).height).toBeGreaterThan(size.height - 40);
  await page.click("#jsonBtn");
  const json = await page.locator("#jsonPanel").boundingBox();
  expect(json.height).toBeGreaterThan(size.height - 40);
  expect(json.x).toBeLessThan(30);
  await page.click("#propBtn");
  await expect(page.locator("#panel")).toBeHidden();
  await page.click("#propBtn");
  await expect(page.locator("#panel")).toBeVisible();
});

test("label and date text sizes are set in Properties", async ({ page }) => {
  await open(page);
  const size = sel => page.evaluate(sel => parseFloat(getComputedStyle(document.querySelector(sel)).fontSize), sel);
  const label0 = await size(".aname"), date0 = await size(".blabel");
  await page.selectOption("#t-labelScale", "130");
  await page.selectOption("#t-dateScale", "80");
  expect(await size(".aname")).toBeCloseTo(label0 * 1.3, 1);
  expect(await size(".blabel")).toBeCloseTo(date0 * 0.8, 1);
  const s = await state(page);
  expect([s.settings.labelScale, s.settings.dateScale]).toEqual([130, 80]);
});

test("the timeline is stretched by dragging its year scale, and double-click fits it again", async ({ page }) => {
  await open(page);
  const width = () => page.evaluate(() => document.querySelector(".year").getBoundingClientRect().width);
  const before = await width();
  const b = await page.locator(".years").boundingBox();
  await page.mouse.move(b.x + 200, b.y + 10);
  await page.mouse.down();
  await page.mouse.move(b.x + 440, b.y + 10, { steps: 8 });
  await page.mouse.up();
  await settle(page);
  expect(await width()).toBeGreaterThan(before * 1.5);
  const c = await page.locator("#chart").boundingBox();
  await page.mouse.dblclick(c.x + c.width - 120, b.y + 10);     // a spot on the scale that is not under the pinned name column
  await settle(page);
  expect(await width()).toBeCloseTo(before, 0);
});

test("a pinned floating card follows its row when rows above it are hidden; a free one stays put", async ({ page }) => {
  await open(page, "edit");
  const top = id => page.evaluate(id => parseFloat(document.querySelector("#fc-" + id).style.top), id);
  expect((await state(page)).cards[1]).toMatchObject({ pin: true, row: "a9" });
  await page.click("#pi-f3");                                   // f3 is now placed freely
  expect((await state(page)).cards[2].pin).toBe(false);
  const pinnedEdit = await top("f2"), freeEdit = await top("f3");
  await page.click("#eh-a3");
  await page.click("#eh-a4");                                   // two rows above both cards are hidden
  await page.click("#modeView");
  await settle(page);
  // View mode drops the two hidden rows and the three add rows above the pinned card (30px each).
  expect(await top("f2")).toBe(pinnedEdit - 5 * 30 + 2 * 30);
  expect(await top("f3")).toBe(freeEdit);
});

test("right-click fits the timeline to a row, so the row fills the middle 80%", async ({ page }) => {
  await open(page);
  await page.locator("#r-a11 .aname").click({ button: "right" });
  await page.locator("#ctx button", { hasText: "Fit the timeline to this row" }).click();
  await settle(page);
  const m = await page.evaluate(() => { const c = document.querySelector("#chart").getBoundingClientRect(), left = document.querySelector(".corner").getBoundingClientRect().right, b = document.querySelector("#b-a11").getBoundingClientRect();
    return { vis: c.right - left, bar: b.width, before: b.left - left, after: c.right - b.right }; });
  expect(m.bar / m.vis).toBeGreaterThan(0.76);
  expect(m.bar / m.vis).toBeLessThan(0.84);
  expect(Math.abs(m.before - m.after)).toBeLessThan(m.vis * 0.05);
  await page.locator("#g-p2 .gname").click({ button: "right" });
  await expect(page.locator("#ctx")).toContainText("Fit the timeline to this row");
});

test("the image export shows the timeline as it is on screen; the whole timeline is a separate export", async ({ page }, info) => {
  await open(page);
  const fs = await import("node:fs");
  const width = file => fs.readFileSync(file).readUInt32BE(16);                 // PNG width
  const save = async act => { await page.click("#exBtn"); const [d] = await Promise.all([page.waitForEvent("download"), page.click('[data-act="' + act + '"]')]); const f = info.outputPath(act + ".png"); await d.saveAs(f); await settle(page); return f; };
  await page.locator("#r-a11 .aname").click({ button: "right" });
  await page.locator("#ctx button", { hasText: "Fit the timeline to this row" }).click();
  await settle(page);
  const scrolled = await page.evaluate(() => document.querySelector("#chart").scrollLeft);
  expect(scrolled).toBeGreaterThan(100);
  const view = width(await save("exPng")), all = width(await save("exPngAll"));
  expect(all).toBeGreaterThan(view * 2);
  // Afterwards the screen is as it was.
  expect(await page.evaluate(() => document.querySelector("#chart").scrollLeft)).toBeCloseTo(scrolled, -1);
  await expect(page.locator("#panel")).toBeVisible();
});

test("the JSON editor lists floating cards and panel cards, and edits to them apply", async ({ page }) => {
  await open(page, "edit");
  await page.click("#jsonBtn");
  const text = await page.inputValue("#src");
  expect(text).toContain('"floatingCards":[');
  expect(text).toContain('"panelCards":[');
  expect(text).toContain('{"id":"f2","title":"Custard Logistics","badge":"4"');
  expect(text).toContain('{"id":"n1","label":"Principle 1","title":"Tea first"');
  const before = (await state(page)).cards[1];
  // Rename a floating card, change a panel card's text, and add a panel card by copying a line shape.
  await page.fill("#src", text.replace('"title":"Custard Logistics"', '"title":"Custard, logistically"').replace("No decision is taken before the kettle has boiled.", "Tea **first**.")
    .replace('"panelCards":[', '"panelCards":[\n    {"label":"New","title":"Added in JSON","badge":"9","text":"Hello"},'));
  await expect(page.locator("#srcStatus")).toContainText("Valid");
  const s = await state(page);
  expect(s.cards[1].title).toBe("Custard, logistically");
  expect([s.cards[1].color, s.cards[1].w, s.cards[1].pin, s.cards[1].row]).toEqual([before.color, before.w, true, "a9"]);   // what is not in the line is kept
  expect(s.panel).toHaveLength(6);
  expect(s.panel[0]).toMatchObject({ title: "Added in JSON", eyebrow: "New", badge: "9", md: "Hello" });
  expect(s.panel[1].md).toBe("Tea **first**.");
  await expect(page.locator("#fc-f2 h3")).toHaveText("Custard, logistically");
  // Pinning to a row that does not exist is refused, with a reason.
  await page.fill("#src", (await page.inputValue("#src")).replace('"row":"a9"', '"row":"nope"'));
  await expect(page.locator("#srcStatus")).toContainText("Not applied");
  await expect(page.locator("#srcStatus")).toContainText("nope");
});

test("the JSON editor numbers its lines, names the line of a mistake, and formats on save", async ({ page }) => {
  await open(page, "edit");
  await page.click("#jsonBtn");
  const text = await page.inputValue("#src"), lines = text.split("\n").length;
  await expect(page.locator("#srcNum div")).toHaveCount(lines);
  await expect(page.locator("#srcNum div").last()).toHaveText(String(lines));
  // Messy but valid: everything on fewer lines, with odd spacing. Saving lays it out again.
  const messy = text.replace(/\n\s*\{"id":"a2"/, '   {"id":"a2"').replace('"name":"Paint the invisible fence"', '"name" :   "Paint it twice"');
  await page.fill("#src", messy);
  await expect(page.locator("#srcStatus")).toContainText("Valid");
  await page.locator("#src").press("Control+s");
  await expect(page.locator("#srcStatus")).toContainText("formatted");
  const tidy = await page.inputValue("#src");
  expect(tidy.split("\n").length).toBe(lines);
  expect(tidy).toContain('      {"id":"a3","name":"Paint it twice"');
  await expect(page.locator("#srcNum div")).toHaveCount(lines);
  // A mistake is reported with its line, and that line is marked in the gutter.
  const broken = tidy.split("\n"); broken[4] = broken[4].replace('"name":', '"name"');
  await page.fill("#src", broken.join("\n"));
  await expect(page.locator("#srcStatus")).toContainText("Not applied, line 5");
  await expect(page.locator("#srcNum div.bad")).toHaveText("5");
  // The Format button does nothing to text that is not valid.
  await page.click("#srcFmt");
  expect(await page.inputValue("#src")).toBe(broken.join("\n"));
});

test("Export > Standalone page, view only opens exactly as exported and cannot be edited", async ({ page, context }, info) => {
  await open(page);
  await page.click("#ct-p2");                                                   // collapse a workstream
  await page.selectOption("#t-theme", "dark");
  await page.click("#pt-cards");
  await page.locator("#r-a11 .aname").click({ button: "right" });
  await page.locator("#ctx button", { hasText: "Fit the timeline to this row" }).click();
  await settle(page);
  const look = () => ({ year: document.querySelector(".year").getBoundingClientRect().width, left: document.querySelector("#chart").scrollLeft, rows: document.querySelectorAll("#inner .row").length,
    theme: document.documentElement.getAttribute("data-theme"), cards: !document.querySelector("#tabCards").hidden });
  const before = await page.evaluate(look);
  await page.click("#exBtn");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click('[data-act="exHtmlView"]')]);
  expect(download.suggestedFilename()).toMatch(/-view\.html$/);
  const file = info.outputPath("view-only.html");
  await download.saveAs(file);

  const copy = await context.newPage(), problems = [];
  copy.on("pageerror", e => problems.push(String(e)));
  copy.on("console", m => { if (m.type() === "error") problems.push(m.text()); });
  await copy.setViewportSize(page.viewportSize());
  await copy.goto("file://" + file);
  await settle(copy);
  const after = await copy.evaluate(look);
  expect(after.rows).toBe(before.rows);
  expect(after.theme).toBe("dark");
  expect(after.cards).toBe(true);
  expect(after.year).toBeCloseTo(before.year, 0);
  expect(Math.abs(after.left - before.left)).toBeLessThan(3);
  // Nothing that changes the roadmap is offered.
  for (const sel of ["#modeEdit", "#undo", "#jsonBtn", "#propBtn", "#pt-props", '[data-act="import"]']) await expect(copy.locator(sel)).toBeHidden();
  await copy.locator("#r-a11 .aname").click({ button: "right" });
  await expect(copy.locator("#ctx")).toContainText("Zoom in");
  await expect(copy.locator("#ctx")).not.toContainText("Switch to Edit");
  await copy.keyboard.press("Escape");
  expect(await copy.evaluate(() => document.body.classList.contains("edit"))).toBe(false);
  // It still reads like the app: hover cards work, and a reload shows it as exported again.
  await copy.hover("#b-a11");
  await expect(copy.locator("#hover")).toBeVisible();
  await copy.click("#ct-p1");
  await copy.reload();
  await settle(copy);
  expect((await copy.evaluate(look)).rows).toBe(before.rows);
  expect(problems).toEqual([]);
});

test("the header is a slim bar whose size and font are set in Properties, with a date chip that can be left out", async ({ page }) => {
  await open(page);
  await expect(page.locator("#subtitle")).toHaveCount(0);
  await expect(page.locator(".banner")).not.toContainText("Roadmap & schedule");
  const box = () => page.locator(".banner").boundingBox(), h1 = () => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#title")).fontSize));
  const slim = (await box()).height, size = await h1();
  expect(slim).toBeLessThan(64);
  await page.selectOption("#t-bannerScale", "150");
  expect(await h1()).toBeCloseTo(size * 1.5, 0);
  expect((await box()).height).toBeGreaterThan(slim);
  await page.selectOption("#t-bannerFont", "inter");
  await expect(page.locator("#title")).toHaveCSS("font-family", /Inter/);
  // The chip is on the right, and can be switched off.
  const chip = await page.locator("#todaychip").boundingBox(), bar = await box();
  expect(chip.x + chip.width).toBeGreaterThan(bar.x + bar.width - 40);
  await expect(page.locator("#todaychip")).toHaveText(/^Today \d{2} \w{3} \d{4}$/);
  await page.uncheck("#t-showChip");
  await expect(page.locator("#todaychip")).toBeHidden();
  const s = await state(page);
  expect([s.settings.bannerScale, s.settings.bannerFont, s.settings.showChip, s.settings.chipExport]).toEqual([150, "inter", false, true]);
});

test("the header style is chosen in Properties: every style but Classic is one slim, square line", async ({ page }) => {
  await open(page);
  const box = () => page.locator(".banner").boundingBox();
  const look = () => page.evaluate(() => { const b = getComputedStyle(document.querySelector(".banner")), t = document.querySelector("#title").getBoundingClientRect(), g = document.querySelector("#tagline").getBoundingClientRect();
    return { radius: b.borderTopLeftRadius, oneLine: Math.abs((t.top + t.height / 2) - (g.top + g.height / 2)) < 3 && g.left >= t.right }; });
  expect((await state(page)).settings.bannerStyle).toBe("tab");
  await expect(page.locator("#title")).toHaveCSS("font-family", /Open Sans/);
  for (const style of ["tab", "strip", "glass", "underline", "twotone"]) {
    await page.selectOption("#t-bannerStyle", style);
    await expect(page.locator("body")).toHaveClass(new RegExp("bn-" + style));
    expect((await box()).height, style).toBeLessThanOrEqual(32);
    expect(await look(), style).toEqual({ radius: "0px", oneLine: true });
  }
  await page.selectOption("#t-bannerStyle", "classic");
  expect((await box()).height).toBeGreaterThan(40);
  expect((await look()).oneLine).toBe(false);
  expect((await state(page)).settings.bannerStyle).toBe("classic");
});

test("Ctrl+K and Ctrl+Space open a command palette with grouped, searchable commands", async ({ page }) => {
  await open(page);
  const pal = page.locator("#pal"), rows = page.locator("#palList .pali"), groups = () => page.locator("#palList .palg").allTextContents();
  await expect(pal).toBeHidden();
  await page.keyboard.press("Control+k");
  await expect(pal).toBeVisible();
  await expect(page.locator("#palIn")).toBeFocused();
  expect(await groups()).toEqual(["View", "Add", "Edit", "Show or hide", "Files", "Help"]);
  await expect(rows.first()).toHaveClass(/on/);
  await expect(rows.first()).toHaveCSS("border-radius", "0px");
  // The same key closes it, and so does Escape; Ctrl+Space opens it too.
  await page.keyboard.press("Control+k");
  await expect(pal).toBeHidden();
  await page.keyboard.press("Control+Space");
  await expect(pal).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(pal).toBeHidden();
  // Typing narrows the list, including the less common settings, and Enter runs the highlighted command.
  await page.click("#palBtn");
  await page.keyboard.type("row tall");
  await expect(rows).toHaveText(["Row height: Tall", "Row height: Extra tall"]);
  await page.keyboard.press("ArrowDown");
  await expect(rows.nth(1)).toHaveClass(/on/);
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(pal).toBeHidden();
  expect((await state(page)).settings.rowH).toBe(48);
  // A switch shows whether it is on, and choosing it flips it.
  await page.keyboard.press("Control+k");
  await page.keyboard.type("hide critical");
  await expect(rows).toHaveText(["Critical pathShown"]);
  await expect(rows.first().locator(".paln")).toHaveText("Shown");
  await page.keyboard.press("Enter");
  expect((await state(page)).settings.showCritical).toBe(false);
  // A command that changes the roadmap says it switches to Edit, and does.
  await page.keyboard.press("Control+k");
  await page.keyboard.type("add a workstream");
  await expect(rows.first().locator(".paln")).toHaveText("Switches to Edit");
  const n = (await state(page)).phases.length;
  await page.keyboard.press("Enter");
  await expect(page.locator("#modeEdit")).toHaveClass(/on/);
  expect((await state(page)).phases.length).toBe(n + 1);
  // Names on the roadmap are found too; choosing one selects it.
  await page.keyboard.press("Control+k");
  await page.keyboard.type("invisible fence");
  await expect(page.locator("#palList .palg")).toHaveText(["On the roadmap"]);
  await rows.first().click();
  await expect(pal).toBeHidden();
  await expect(page.locator("#istrip input[type=text]").first()).toHaveValue("Paint the invisible fence");
  // Nothing found is said plainly.
  await page.keyboard.press("Control+k");
  await page.keyboard.type("zzzz");
  await expect(page.locator("#palList .pale")).toContainText("Nothing matches");
});

test("pointer tracking: the timeline glides towards an edge, the wheel zooms, a row click folds, Esc or right-click stops", async ({ page }) => {
  await open(page);
  const scroll = () => page.evaluate(() => { const c = document.querySelector("#chart"); return [Math.round(c.scrollLeft), Math.round(c.scrollTop)]; });
  const yearW = () => page.evaluate(() => document.querySelector("#inner .year").getBoundingClientRect().width);
  const on = () => page.evaluate(() => document.body.classList.contains("tracking"));
  await page.click('[data-act="zin"]'); await page.click('[data-act="zin"]'); await page.click('[data-act="zin"]');
  await settle(page);
  const box = await page.locator("#chart").boundingBox(), midX = box.x + box.width * 0.6, midY = box.y + box.height * 0.55;
  // Off: the pointer at the edge does nothing.
  await page.mouse.move(box.x + box.width - 12, midY);
  await page.waitForTimeout(400);
  expect(await scroll()).toEqual([0, 0]);
  // On, from the toolbar.
  await page.mouse.move(midX, midY);
  await page.click("#trackBtn");
  await expect(page.locator("#trackBtn")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#trackTag")).toBeVisible();
  await page.mouse.move(midX, midY);
  await page.waitForTimeout(500);
  expect(await scroll(), "the middle is a rest zone").toEqual([0, 0]);
  await page.mouse.move(box.x + box.width - 12, midY, { steps: 5 });
  await expect.poll(async () => (await scroll())[0]).toBeGreaterThan(150);
  await page.mouse.move(midX, box.y + box.height - 8, { steps: 5 });
  await expect.poll(async () => (await scroll())[1]).toBeGreaterThan(60);
  // Back in the middle it comes to rest.
  await page.mouse.move(midX, midY, { steps: 5 });
  await page.waitForTimeout(1500);
  const rest = await scroll();
  await page.waitForTimeout(400);
  expect(await scroll()).toEqual(rest);
  // The wheel zooms the timeline instead of scrolling it.
  const w0 = await yearW();
  await page.mouse.wheel(0, -300);
  await expect.poll(yearW).toBeGreaterThan(w0 * 1.3);
  // A click on a row folds its workstream; a click on a bar still opens its details.
  const headBottom = await page.evaluate(() => document.querySelector("#inner .hrow").getBoundingClientRect().bottom);
  await page.mouse.move(midX, headBottom + 10, { steps: 4 });
  await expect.poll(async () => (await scroll())[1]).toBe(0);
  await page.mouse.move(midX, midY, { steps: 4 });
  await page.waitForTimeout(900);
  const first = (await state(page)).phases[0].id;
  await page.locator("#r-a2 .aname").click();
  expect((await state(page)).phases[0].collapsed).toBe(true);
  await expect(page.locator("#sheet")).toBeHidden();
  await page.locator("#g-" + first + " .gname").click();
  expect((await state(page)).phases[0].collapsed).toBe(false);
  await page.locator("#b-a4").click({ force: true });
  await expect(page.locator("#sheet")).toBeVisible();
  // Escape closes the dialog first, then leaves tracking.
  await page.keyboard.press("Escape");
  await expect(page.locator("#sheet")).toBeHidden();
  expect(await on()).toBe(true);
  await page.keyboard.press("Escape");
  expect(await on()).toBe(false);
  await expect(page.locator("#trackTag")).toBeHidden();
  await expect(page.locator("#trackBtn")).toHaveAttribute("aria-pressed", "false");
  // The right-click menu starts it and stops it; switching to Edit stops it too.
  await page.locator("#r-a2 .aname").click({ button: "right" });
  await page.locator("#ctx button", { hasText: "Track the pointer" }).click();
  expect(await on()).toBe(true);
  await page.locator("#r-a2 .aname").click({ button: "right" });
  await expect(page.locator("#ctx button").first()).toHaveText("Stop tracking the pointer");
  await page.locator("#ctx button").first().click();
  expect(await on()).toBe(false);
  await page.click("#trackBtn");
  await page.click("#modeEdit");
  expect(await on()).toBe(false);
});

test("dependencies: lines show on hover or for all, turn red when dates clash, and are made by dragging", async ({ page }) => {
  await open(page);
  const op = id => page.locator("#" + id).evaluate(e => getComputedStyle(e).opacity);
  // The sample has a few links. They are drawn but quiet until a bar is under the pointer.
  await expect(page.locator("#deps .dep")).toHaveCount(7);
  expect((await act(page, "a12")).deps).toEqual(["a16"]);
  expect(await op("dp-a16-a12")).toBe("0");
  await page.locator("#b-a16").hover({ force: true });
  await expect(page.locator("#dp-a16-a12")).toHaveClass(/hot/);
  await expect.poll(() => op("dp-a16-a12")).toBe("1");
  expect(await op("dp-a13-a15")).toBe("0");
  await page.mouse.move(5, 5);
  // Edit mode: the Links eye shows them all.
  await page.click("#modeEdit");
  await settle(page);
  await page.click("#ey-showDeps");
  await expect(page.locator("#deps")).toHaveClass(/all/);
  await expect.poll(() => op("dp-a13-a15")).toBe("1");
  await page.click("#ey-showDeps");
  // Drag from the dot at the end of a bar to another row to link them.
  await page.locator("#b-a8").hover({ force: true });
  const dot = await page.locator("#b-a8 .lk").boundingBox(), row = await page.locator("#r-a5 .track").boundingBox();
  await page.mouse.move(dot.x + dot.width / 2, dot.y + dot.height / 2);
  await page.mouse.down();
  await page.mouse.move(row.x + 300, row.y + row.height / 2, { steps: 8 });
  await expect(page.locator("#r-a5")).toHaveClass(/lkto/);
  await page.mouse.up();
  expect((await act(page, "a5")).deps).toEqual(["a8"]);
  await expect(page.locator("#dp-a8-a5")).not.toHaveClass(/bad/);
  // A link that would go round in a circle, or to itself, is refused.
  await page.locator("#b-a5").hover({ force: true });
  const dot2 = await page.locator("#b-a5 .lk").boundingBox(), row2 = await page.locator("#r-a8 .track").boundingBox();
  await page.mouse.move(dot2.x + dot2.width / 2, dot2.y + dot2.height / 2);
  await page.mouse.down();
  await page.mouse.move(row2.x + 300, row2.y + row2.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator("#toast")).toContainText("round in a circle");
  expect((await act(page, "a8")).deps).toEqual([]);
  // Moving the waiting activity to start before the other ends turns the line red, and it shows while editing. Nothing else moves.
  const before = await act(page, "a8");
  await page.fill("#ds-a5", before.start);
  await page.locator("#ds-a5").blur();
  await expect(page.locator("#dp-a8-a5")).toHaveClass(/bad/);
  await page.mouse.move(5, 5);
  await expect.poll(() => op("dp-a8-a5")).toBe("1");
  expect(await act(page, "a8")).toEqual(before);
  // The right-click menu removes a link; deleting an activity removes its links.
  await page.locator("#r-a5 .track").click({ button: "right", position: { x: 6, y: 12 } });
  await page.locator("#ctx button", { hasText: "Remove the link from" }).click();
  expect((await act(page, "a5")).deps).toEqual([]);
  await page.click("#dl-a16");
  expect((await act(page, "a12")).deps).toEqual([]);
  await expect(page.locator("#deps .dep")).toHaveCount(6);
});

test("the Cards heading is renamed in Properties, and the tab follows", async ({ page }) => {
  await open(page, "edit");
  await expect(page.locator("#pt-cards")).toHaveText("Guiding principles");
  await page.fill("#r-panelTitle", "House rules");
  await expect(page.locator("#pt-cards")).toHaveText("House rules");
  await page.click("#pt-cards");
  await expect(page.locator("#tabCards h2")).toHaveText("House rules");
  expect((await state(page)).settings.panelTitle).toBe("House rules");
});

test("the timeline years are set in Properties", async ({ page }) => {
  await open(page, "edit");
  await page.fill("#r-years", "4");
  await expect(page.locator(".year")).toHaveCount(4);
  expect((await state(page)).years).toBe(4);
});

test("Randomise colours gives a new matched set each time, and Undo brings the old colours back", async ({ page }) => {
  await open(page, "edit");
  const colours = async () => { const s = await state(page); return { banner: s.settings.banner, accent: s.settings.accent, ws: s.phases.map(p => p.color), cards: s.cards.map(c => c.color), all: [s.settings.banner, s.settings.bannerInk, s.settings.accent, s.settings.today].concat(s.phases.map(p => p.color), s.critical.map(c => c.color), s.milestones.map(m => m.color), s.cards.map(c => c.color), s.panel.map(c => c.color)) }; };
  const before = await colours();
  await page.click("#randCol");
  const first = await colours();
  for (const c of first.all) expect(c).toMatch(/^#[0-9A-F]{6}$/);
  expect(first.ws).not.toEqual(before.ws);
  expect(new Set(first.ws).size).toBe(first.ws.length);                       // every workstream gets its own colour
  expect(first.cards[0]).toBe(first.ws[0]);                                   // card "1" follows workstream 1
  await expect(page.locator("#toast")).toContainText("New colours");
  await page.click("#randCol");
  expect((await colours()).ws).not.toEqual(first.ws);
  await page.click("#undo");
  expect((await colours()).ws).toEqual(first.ws);
  await page.click("#undo");
  expect(await colours()).toEqual(before);
  // Light / dark switches the theme either way.
  const theme = () => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  await page.click("#flipTheme");
  const one = await theme();
  await page.click("#flipTheme");
  expect([one, await theme()].sort()).toEqual(["dark", "light"]);
});
