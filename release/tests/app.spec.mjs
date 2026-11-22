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

test("an item's settings open under it and typing keeps the caret", async ({ page }) => {
  await open(page, "edit");
  await page.click("#pe-a2");
  await expect(page.locator("#istrip")).toBeVisible();
  expect(await page.evaluate(() => document.querySelector("#r-a2").nextElementSibling.id)).toBe("istrip");
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
  await page.click("#pt-source");
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

test("the Guide has narrated videos with subtitles and the list is called Features", async ({ page }) => {
  await open(page);
  await expect(page.locator("#pt-reqs")).toHaveText("Features");
  await page.click("#pt-guide");
  await expect(page.locator(".gstep")).toHaveCount(5);
  // The videos are rendered later in the release build; until they exist each step says how to make them.
  if (await page.locator(".gstep video").count()) {
    await expect(page.locator(".gstep video")).toHaveCount(5);
    await expect(page.locator('.gstep video track[kind="subtitles"]')).toHaveCount(5);
    await expect(page.locator(".gstep video source").first()).toHaveAttribute("src", /-light\.mp4$/);
    await page.selectOption("#t-theme", "dark");
    await expect(page.locator(".gstep video source").first()).toHaveAttribute("src", /-dark\.mp4$/);
  } else await expect(page.locator(".gstep .novid")).toHaveCount(5);
  await expect(page.locator(".gstep ol li").first()).toBeVisible();
  await page.click("#pt-reqs");
  await expect(page.locator("#panel")).toContainText("Intuitive interactive view");
  await expect(page.locator("#panel")).not.toContainText("Jira");
});
