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
  await page.click("#ey-colStart");
  await expect(page.locator("#ds-a1")).toHaveCount(0);
  await page.click("#ey-colStart");
  await expect(page.locator("#ds-a1")).toBeVisible();
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
  expect(s.version).toBe(3);
  expect(s.settings.upper).toBe(false);
  expect(s.settings.barStart).toBe(false);
  expect(s.activities.map(a => a.start)).toEqual(["2026-01-01", ""]);
});

test("Help opens in its own window with the steps for every chapter", async ({ page, context }) => {
  await open(page);
  await expect(page.locator("#pt-props")).toHaveText("Properties");
  const [help] = await Promise.all([context.waitForEvent("page"), page.click("#helpBtn")]);
  await help.waitForLoadState();
  await expect(help.locator("h1")).toHaveText("Roadmap Builder help");
  await expect(help.locator(".gstep")).toHaveCount(5);
  await expect(help.locator(".gstep ol li").first()).toBeVisible();
  // The videos are rendered later in the release build; where they exist each chapter has one, with subtitles.
  if (await help.locator(".gstep video").count()) {
    await expect(help.locator(".gstep video")).toHaveCount(5);
    await expect(help.locator('.gstep video track[kind="subtitles"]')).toHaveCount(5);
  }
  await expect(help.locator("#helpTake")).toContainText("Download the offline copy");
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
  await page.goto(new URL("../../app/help.html", import.meta.url).href);
  await expect(page.locator(".gstep")).toHaveCount(5);
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
  await expect(copy.locator(".gname").first()).toHaveCSS("font-family", /Barlow/);
  expect(await copy.evaluate(() => document.fonts.check('600 14px "Barlow"'))).toBe(true);
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
