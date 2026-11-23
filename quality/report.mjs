// Gathers the raw results in <report>/raw, <report>/coverage and <report>/sbom into three files:
//   kpis.json   every figure, for machines and for comparing one run with the next
//   SUMMARY.md  the figures on half a page, for a terminal or a release note
//   index.html  the figures and the findings behind them, one self-contained page
// It never fails because of a finding. A result that is missing is shown as "not available".
import fs from "node:fs";
import path from "node:path";

const [REPORT = "/report", SITE = "/site", SRC = "/src"] = process.argv.slice(2);
const VERSION = process.env.VERSION || "working copy", SCAN_DATE = process.env.SCAN_DATE || "unset";
const read = f => { try { return fs.readFileSync(path.join(REPORT, f), "utf8"); } catch (e) { return null; } };
const json = f => { const t = read(f); if (t == null) return null; try { return JSON.parse(t); } catch (e) { return null; } };
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const rel = p => String(p || "").replace(/^\/src\//, "").replace(/^\.\//, "");
const SEV = ["Critical", "High", "Medium", "Low", "Negligible", "Unknown"];

/* ---------- tests ---------- */
const tj = json("raw/tests.json");
const tests = tj ? (() => {
  const list = []; const walk = s => { (s.specs || []).forEach(x => list.push({ title: x.title, ok: x.ok, ms: (x.tests[0]?.results || []).reduce((a, r) => a + r.duration, 0) })); (s.suites || []).forEach(walk); };
  tj.suites.forEach(walk);
  return { total: list.length, passed: list.filter(x => x.ok).length, failed: list.filter(x => !x.ok).length, flaky: tj.stats.flaky, seconds: Math.round(tj.stats.duration / 100) / 10,
    failedTitles: list.filter(x => !x.ok).map(x => x.title), slowest: list.slice().sort((a, b) => b.ms - a.ms).slice(0, 5).map(x => ({ title: x.title, seconds: Math.round(x.ms / 100) / 10 })) };
})() : null;

/* ---------- coverage ---------- */
const cj = json("coverage/coverage-report.json");
const pct = m => (m && typeof m.pct === "number" ? m.pct : null);
const coverage = cj ? {
  files: cj.files.map(f => ({ file: f.sourcePath, type: f.type, functions: pct(f.summary.functions), branches: pct(f.summary.branches), statements: pct(f.summary.statements), lines: pct(f.summary.lines), bytes: pct(f.summary.bytes),
    functionsTotal: f.summary.functions.total, functionsUncovered: f.summary.functions.uncovered })),
  bytes: pct(cj.summary.bytes), functions: pct(cj.summary.functions), branches: pct(cj.summary.branches), statements: pct(cj.summary.statements)
} : null;
const covOf = name => coverage && coverage.files.find(f => f.file.endsWith(name));

/* ---------- static analysis: every tool becomes a list of {tool, level, rule, file, line, message} ---------- */
const findings = []; const toolState = {};
const add = (tool, level, rule, file, line, message) => findings.push({ tool, level, rule: rule || "", file: rel(file), line: line || 0, message: String(message || "").split("\n")[0] });
const tool = (name, file, fn) => { const d = json(file); if (!d) { toolState[name] = "not available"; return; } toolState[name] = "ran"; try { fn(d); } catch (e) { toolState[name] = "could not be read: " + e.message; } };
tool("ESLint", "raw/eslint.json", d => d.forEach(f => f.messages.forEach(m => add("ESLint", m.severity === 2 ? "error" : "warning", m.ruleId, f.filePath, m.line, m.message))));
tool("Stylelint", "raw/stylelint.json", d => d.forEach(f => f.warnings.forEach(m => add("Stylelint", m.severity === "error" ? "error" : "warning", m.rule, f.source, m.line, m.text))));
tool("html-validate", "raw/html.json", d => d.forEach(f => f.messages.forEach(m => add("html-validate", m.severity === 2 ? "error" : "warning", m.ruleId, f.filePath, m.line, m.message))));
tool("ShellCheck", "raw/shellcheck.json", d => d.forEach(m => add("ShellCheck", m.level === "error" ? "error" : m.level === "warning" ? "warning" : "note", "SC" + m.code, m.file, m.line, m.message)));
tool("Hadolint", "raw/hadolint.json", d => d.forEach(m => add("Hadolint", m.level === "error" ? "error" : m.level === "warning" ? "warning" : "note", m.code, m.file, m.line, m.message)));
tool("Ruff", "raw/ruff.json", d => d.forEach(m => add("Ruff", "error", m.code, m.filename, m.location && m.location.row, m.message)));
const TOOLS = ["ESLint", "Stylelint", "html-validate", "ShellCheck", "Hadolint", "Ruff"];
const WHAT = { ESLint: "JavaScript: the app, build, test and recording scripts", Stylelint: "The stylesheet", "html-validate": "The page and the film's stage", ShellCheck: "Shell scripts", Hadolint: "Dockerfiles", Ruff: "Python (the narration scripts)" };
const count = (t, level, inApp) => findings.filter(f => f.tool === t && (!level || f.level === level) && (inApp == null || f.file.startsWith("app/") === inApp)).length;
const staticKpi = Object.fromEntries(TOOLS.map(t => [t, { state: toolState[t], errors: count(t, "error"), warnings: count(t, "warning"), notes: count(t, "note") }]));
const shippedCode = f => f.file.startsWith("app/");

/* ---------- vulnerabilities ---------- */
const GROUPS = [
  ["shipped", "Packaged with the app", "The four libraries and the fonts served to the browser (assets/package-lock.json)."],
  ["image", "The image that serves it", "nginx on Alpine, as pulled today. Only the container is affected; the zip, the hosted site and standalone pages contain none of it."],
  ["build", "Used only to build", "Recording and quality tools (film/, quality/). Never handed to a user."]
];
const cve = {}; let dbBuilt = null;
for (const [key] of GROUPS) {
  const d = json("raw/cve-" + key + ".json"), s = json("sbom/" + key + ".cdx.json");
  if (!d) { cve[key] = null; continue; }
  dbBuilt = dbBuilt || d.descriptor?.db?.status?.built || null;
  const seen = new Set(), list = [];
  for (const m of d.matches || []) {
    const v = m.vulnerability, a = m.artifact, id = v.id + "|" + a.name + "|" + a.version; if (seen.has(id)) continue; seen.add(id);
    const alias = (m.relatedVulnerabilities || []).map(r => r.id).find(x => /^CVE-/.test(x) && x !== v.id) || "";
    list.push({ id: v.id, alias, severity: SEV.includes(v.severity) ? v.severity : "Unknown", pkg: a.name, version: a.version, fix: (v.fix?.versions || []).join(", "), url: v.dataSource || "", about: v.description || (m.relatedVulnerabilities || [])[0]?.description || "" });
  }
  list.sort((x, y) => SEV.indexOf(x.severity) - SEV.indexOf(y.severity) || x.pkg.localeCompare(y.pkg));
  const by = Object.fromEntries(SEV.map(sv => [sv, list.filter(x => x.severity === sv).length]));
  cve[key] = { total: list.length, by, highOrCritical: by.Critical + by.High, fixable: list.filter(x => x.fix).length, packagesAffected: new Set(list.map(x => x.pkg)).size, components: s ? (s.components || []).filter(c => c.type !== "file").length : null, list };
}

/* ---------- size ---------- */
const size = f => { try { return fs.statSync(f).size; } catch (e) { return null; } };
const lines = f => { try { return fs.readFileSync(f, "utf8").split("\n").length; } catch (e) { return null; } };
const sizes = {
  appJs: { bytes: size(SITE + "/app.js"), lines: lines(SITE + "/app.js") }, stylesCss: { bytes: size(SITE + "/styles.css"), lines: lines(SITE + "/styles.css") }, indexHtml: { bytes: size(SITE + "/index.html"), lines: lines(SITE + "/index.html") },
  vendorBytes: (() => { try { return fs.readdirSync(SITE + "/vendor").filter(f => f.endsWith(".js")).reduce((a, f) => a + size(SITE + "/vendor/" + f), 0); } catch (e) { return null; } })(),
  standaloneTemplateBytes: size(SITE + "/standalone-template.js"), testLines: lines(SRC + "/release/tests/app.spec.mjs")
};

/* ---------- things the tools cannot see, said plainly ---------- */
const notes = [];
const scanLog = read("raw/scan.log") || "";
if (/no lock file/.test(scanLog)) notes.push("release/package.json has no lock file, so the test runner's packages are not pinned and are not in the vulnerability scan.");
if (/failed for/.test(scanLog)) notes.push("A scan step failed: " + scanLog.split("\n").filter(l => /failed for/.test(l)).join("; "));
TOOLS.filter(t => toolState[t] !== "ran").forEach(t => notes.push(t + ": " + toolState[t] + "."));
if (!tests) notes.push("The test results are not available."); if (!coverage) notes.push("The coverage results are not available.");
notes.push("Coverage is of the code the 38 browser tests run in Chromium. It says what was exercised, not whether the checks are good.");
notes.push("The vulnerability figures are as of the database date; they change without any change to the code.");
notes.push("A listed vulnerability means a known advisory matches a package and version. Whether the app uses the affected part has not been assessed.");

/* ---------- the figures ---------- */
const app = covOf("app/app.js"), css = covOf("app/styles.css");
const kpis = {
  version: VERSION, scanDate: SCAN_DATE, vulnerabilityDatabaseBuilt: dbBuilt, generated: new Date().toISOString(), mode: "report only",
  tests, coverage: coverage && { appJs: app && { functions: app.functions, branches: app.branches, statements: app.statements, lines: app.lines, functionsNeverRun: app.functionsUncovered, functionsTotal: app.functionsTotal }, stylesCss: css && { lines: css.lines, bytes: css.bytes }, overallBytes: coverage.bytes },
  staticAnalysis: { tools: staticKpi, errors: findings.filter(f => f.level === "error").length, warnings: findings.filter(f => f.level === "warning").length, notes: findings.filter(f => f.level === "note").length, inShippedCode: findings.filter(shippedCode).length },
  vulnerabilities: Object.fromEntries(GROUPS.map(([k]) => [k, cve[k] && { total: cve[k].total, ...Object.fromEntries(SEV.map(s => [s.toLowerCase(), cve[k].by[s]])), highOrCritical: cve[k].highOrCritical, withAFix: cve[k].fixable, packagesAffected: cve[k].packagesAffected }])),
  inventory: Object.fromEntries(GROUPS.map(([k]) => [k, cve[k] && cve[k].components])),
  size: sizes, notes
};
fs.writeFileSync(path.join(REPORT, "kpis.json"), JSON.stringify(kpis, null, 2) + "\n");

/* ---------- SUMMARY.md ---------- */
const na = "not available", p = v => (v == null ? na : v.toFixed(1) + "%"), kb = b => (b == null ? na : Math.round(b / 1024) + " KB");
const cveLine = k => (cve[k] ? cve[k].total + " (" + cve[k].by.Critical + " critical, " + cve[k].by.High + " high, " + cve[k].by.Medium + " medium, " + cve[k].by.Low + " low), " + cve[k].fixable + " with a fix" : na);
const md = [
  "# Quality report: Roadmap Builder " + VERSION, "",
  "Report only: nothing here stops a build. Vulnerability database built " + (dbBuilt || na) + ".", "",
  "| Figure | Value |", "|---|---|",
  "| Browser tests | " + (tests ? tests.passed + " of " + tests.total + " passed" + (tests.failed ? ", " + tests.failed + " FAILED" : "") + " in " + tests.seconds + " s" : na) + " |",
  "| Coverage of app.js | " + (app ? "functions " + p(app.functions) + ", branches " + p(app.branches) + ", statements " + p(app.statements) + " (" + app.functionsUncovered + " of " + app.functionsTotal + " functions never run)" : na) + " |",
  "| Coverage of styles.css | " + (css ? p(css.bytes) + " of the stylesheet used" : na) + " |",
  "| Static analysis | " + kpis.staticAnalysis.errors + " errors, " + kpis.staticAnalysis.warnings + " warnings, " + kpis.staticAnalysis.notes + " notes; " + kpis.staticAnalysis.inShippedCode + " of them in the app's own files |",
  ...TOOLS.map(t => "| - " + t + " | " + (toolState[t] === "ran" ? staticKpi[t].errors + " errors, " + staticKpi[t].warnings + " warnings" + (staticKpi[t].notes ? ", " + staticKpi[t].notes + " notes" : "") : toolState[t]) + " |"),
  ...GROUPS.map(([k, title]) => "| Vulnerabilities: " + title.toLowerCase() + " | " + cveLine(k) + " |"),
  "| Inventory (components) | " + GROUPS.map(([k, title]) => (cve[k] && cve[k].components != null ? cve[k].components : na) + " " + title.toLowerCase()).join("; ") + " |",
  "| Size | app.js " + kb(sizes.appJs.bytes) + " (" + sizes.appJs.lines + " lines), styles.css " + kb(sizes.stylesCss.bytes) + ", fetched libraries " + kb(sizes.vendorBytes) + " |",
  "", "Notes:", ...notes.map(n => "- " + n), ""
].join("\n");
fs.writeFileSync(path.join(REPORT, "SUMMARY.md"), md);

/* ---------- index.html ---------- */
const tone = (v, good, ok) => (v == null ? "" : v >= good ? "good" : v >= ok ? "ok" : "bad");
const tile = (label, value, sub, cls) => '<div class="tile ' + (cls || "") + '"><div class="lab">' + esc(label) + '</div><div class="val">' + esc(value) + '</div><div class="sub">' + esc(sub || "") + "</div></div>";
const bar = v => (v == null ? '<span class="muted">n/a</span>' : '<span class="meter"><i style="width:' + Math.max(0, Math.min(100, v)) + '%"></i></span> ' + v.toFixed(1) + "%");
const sevTag = s => '<span class="sev ' + s.toLowerCase() + '">' + s + "</span>";
const cveTable = (k, limit) => {
  const c = cve[k]; if (!c) return '<p class="muted">Not available.</p>'; if (!c.total) return "<p>No known vulnerabilities.</p>";
  const rows = (limit ? c.list.filter(x => x.severity === "Critical" || x.severity === "High") : c.list);
  return '<div class="scroll"><table><thead><tr><th>Severity</th><th>Package</th><th>Version</th><th>Fixed in</th><th>Advisory</th><th>What it is</th></tr></thead><tbody>' +
    rows.map(x => "<tr><td>" + sevTag(x.severity) + "</td><td>" + esc(x.pkg) + "</td><td>" + esc(x.version) + "</td><td>" + (x.fix ? esc(x.fix) : '<span class="muted">no fix yet</span>') + '</td><td><a href="' + esc(x.url) + '" rel="noopener noreferrer">' + esc(x.id) + "</a>" + (x.alias ? "<br><small>" + esc(x.alias) + "</small>" : "") + "</td><td>" + esc(x.about.slice(0, 180)) + "</td></tr>").join("") +
    "</tbody></table></div>" + (limit && rows.length < c.total ? '<p class="muted">Critical and high only: ' + rows.length + " of " + c.total + ". The full list is in raw/cve-" + k + ".json.</p>" : "");
};
const sevRow = k => (cve[k] ? SEV.slice(0, 4).map(s => '<td class="num">' + (cve[k].by[s] ? sevTag(s) + " " + cve[k].by[s] : '<span class="muted">0</span>') + "</td>").join("") + '<td class="num">' + cve[k].fixable + '</td><td class="num">' + (cve[k].components ?? "n/a") + "</td>" : '<td colspan="6" class="muted">not available</td>');
const grouped = (() => { const m = new Map(); for (const f of findings) { const key = f.tool + "|" + f.rule + "|" + f.file; const g = m.get(key) || { ...f, n: 0, lines: [] }; g.n++; g.lines.push(f.line); m.set(key, g); } return [...m.values()].sort((a, b) => TOOLS.indexOf(a.tool) - TOOLS.indexOf(b.tool) || b.n - a.n); })();
const shipHC = cve.shipped ? cve.shipped.highOrCritical : null;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quality report: Roadmap Builder ${esc(VERSION)}</title>
<style>
:root{--bg:#f4f6fa;--card:#fff;--ink:#131a2b;--muted:#5d6880;--line:#d9dfea;--good:#1f8a4c;--ok:#b7791f;--bad:#c53030;--accent:#2563eb}
@media (prefers-color-scheme:dark){:root{--bg:#0e1320;--card:#161d2e;--ink:#e8ecf5;--muted:#9aa5bd;--line:#2a344b;--good:#4ade80;--ok:#fbbf24;--bad:#f87171;--accent:#7aa2ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
main{max-width:1180px;margin:0 auto;padding:28px 16px 60px}h1{font-size:26px;margin:0 0 4px}h2{font-size:19px;margin:34px 0 10px}h3{font-size:15px;margin:18px 0 6px}
.muted,small{color:var(--muted)}a{color:var(--accent)}p{margin:6px 0}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:18px}
.tile{background:var(--card);border:1px solid var(--line);border-left:5px solid var(--line);border-radius:8px;padding:12px 14px}
.tile.good{border-left-color:var(--good)}.tile.ok{border-left-color:var(--ok)}.tile.bad{border-left-color:var(--bad)}
.lab{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}.val{font-size:26px;font-weight:700;margin:2px 0}.sub{font-size:13px;color:var(--muted)}
.scroll{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:8px}
table{border-collapse:collapse;width:100%;font-size:13.5px}th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}tr:last-child td{border-bottom:0}.num{white-space:nowrap}
.sev{display:inline-block;font-size:11.5px;font-weight:700;padding:1px 7px;border-radius:10px;color:#fff}.sev.critical{background:#7f1d1d}.sev.high{background:#c53030}.sev.medium{background:#b7791f}.sev.low{background:#4a5568}.sev.negligible,.sev.unknown{background:#718096}
.meter{display:inline-block;width:110px;height:8px;background:var(--line);border-radius:4px;vertical-align:middle;overflow:hidden}.meter i{display:block;height:100%;background:var(--accent)}
code{font:12.5px ui-monospace,Menlo,Consolas,monospace}ul{margin:6px 0;padding-left:20px}.banner{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px 14px;margin-top:14px}
</style></head><body><main>
<h1>Quality report: Roadmap Builder ${esc(VERSION)}</h1>
<p class="muted">Generated ${esc(kpis.generated.slice(0, 16).replace("T", " "))} UTC. Vulnerability database built ${esc(dbBuilt || na)}.</p>
<div class="banner"><b>Report only.</b> Nothing on this page stops a build or a release. It is here to be read and acted on.</div>

<div class="tiles">
${tile("Browser tests", tests ? tests.passed + " / " + tests.total : na, tests ? (tests.failed ? tests.failed + " failed" : "all passed") + " in " + tests.seconds + " s" : "", tests ? (tests.failed ? "bad" : "good") : "")}
${tile("Functions run by tests", app ? app.functions.toFixed(1) + "%" : na, app ? app.functionsUncovered + " of " + app.functionsTotal + " in app.js never run" : "", tone(app && app.functions, 80, 60))}
${tile("Branches run by tests", app ? app.branches.toFixed(1) + "%" : na, "app.js", tone(app && app.branches, 80, 60))}
${tile("Stylesheet used", css ? css.bytes.toFixed(1) + "%" : na, "styles.css, by bytes", tone(css && css.bytes, 80, 60))}
${tile("Static analysis", kpis.staticAnalysis.errors + " errors", kpis.staticAnalysis.warnings + " warnings, " + kpis.staticAnalysis.notes + " notes", kpis.staticAnalysis.errors ? "ok" : "good")}
${tile("Shipped: critical or high", shipHC == null ? na : String(shipHC), cve.shipped ? cve.shipped.total + " known in " + cve.shipped.packagesAffected + " package(s)" : "", shipHC == null ? "" : shipHC ? "bad" : "good")}
${tile("Serving image: critical or high", cve.image ? String(cve.image.highOrCritical) : na, cve.image ? cve.image.total + " known, " + cve.image.fixable + " with a fix" : "", cve.image ? (cve.image.highOrCritical ? "bad" : "good") : "")}
${tile("Build tools: critical or high", cve.build ? String(cve.build.highOrCritical) : na, cve.build ? cve.build.total + " known; never shipped" : "", cve.build ? (cve.build.highOrCritical ? "ok" : "good") : "")}
</div>

<h2>1. Tests and coverage</h2>
${tests ? "<p>" + tests.passed + " of " + tests.total + " browser tests passed in " + tests.seconds + " seconds" + (tests.failed ? ". <b>Failed:</b> " + tests.failedTitles.map(esc).join("; ") : "") + ".</p>" : '<p class="muted">Test results not available.</p>'}
${coverage ? '<div class="scroll"><table><thead><tr><th>File</th><th>Functions</th><th>Branches</th><th>Statements</th><th>Bytes</th></tr></thead><tbody>' + coverage.files.map(f => "<tr><td><code>" + esc(f.file) + "</code></td><td>" + (f.type === "css" ? '<span class="muted">n/a</span>' : bar(f.functions)) + "</td><td>" + (f.type === "css" ? '<span class="muted">n/a</span>' : bar(f.branches)) + "</td><td>" + (f.type === "css" ? '<span class="muted">n/a</span>' : bar(f.statements)) + "</td><td>" + bar(f.bytes) + "</td></tr>").join("") + '</tbody></table></div><p><a href="coverage/index.html">Open the line-by-line coverage report</a>, which shows exactly which code no test reaches.</p>' : '<p class="muted">Coverage not available.</p>'}
${tests ? "<h3>Slowest tests</h3><ul>" + tests.slowest.map(x => "<li>" + x.seconds + " s: " + esc(x.title) + "</li>").join("") + "</ul>" : ""}

<h2>2. Known vulnerabilities</h2>
<div class="scroll"><table><thead><tr><th>Group</th><th>Critical</th><th>High</th><th>Medium</th><th>Low</th><th>With a fix</th><th>Components listed</th></tr></thead><tbody>
${GROUPS.map(([k, title, about]) => "<tr><td><b>" + esc(title) + "</b><br><small>" + esc(about) + "</small></td>" + sevRow(k) + "</tr>").join("")}
</tbody></table></div>
<h3>Packaged with the app (all)</h3>${cveTable("shipped")}
<h3>The image that serves it</h3>${cveTable("image", true)}
<h3>Used only to build (all)</h3>${cveTable("build")}
<p>Inventories in CycloneDX form: <a href="sbom/shipped.cdx.json">shipped</a>, <a href="sbom/image.cdx.json">serving image</a>, <a href="sbom/build.cdx.json">build tools</a>.</p>

<h2>3. Static analysis</h2>
<div class="scroll"><table><thead><tr><th>Tool</th><th>Looks at</th><th>Errors</th><th>Warnings</th><th>Notes</th></tr></thead><tbody>
${TOOLS.map(t => "<tr><td><b>" + t + "</b></td><td>" + esc(WHAT[t]) + "</td>" + (toolState[t] === "ran" ? '<td class="num">' + staticKpi[t].errors + '</td><td class="num">' + staticKpi[t].warnings + '</td><td class="num">' + staticKpi[t].notes + "</td>" : '<td colspan="3" class="muted">' + esc(toolState[t]) + "</td>") + "</tr>").join("")}
</tbody></table></div>
<h3>Findings, grouped by rule and file</h3>
${grouped.length ? '<div class="scroll"><table><thead><tr><th>Tool</th><th>Rule</th><th>File</th><th>Count</th><th>Lines</th><th>Example</th></tr></thead><tbody>' + grouped.map(g => "<tr><td>" + g.tool + "</td><td><code>" + esc(g.rule) + "</code></td><td><code>" + esc(g.file) + '</code></td><td class="num">' + g.n + "</td><td>" + esc(g.lines.slice(0, 12).join(", ")) + (g.lines.length > 12 ? ", …" : "") + "</td><td>" + esc(g.message.slice(0, 160)) + "</td></tr>").join("") + "</tbody></table></div>" : "<p>No findings.</p>"}

<h2>4. Size</h2>
<div class="scroll"><table><thead><tr><th>File</th><th>Size</th><th>Lines</th></tr></thead><tbody>
<tr><td><code>app/app.js</code></td><td>${kb(sizes.appJs.bytes)}</td><td>${sizes.appJs.lines ?? na}</td></tr>
<tr><td><code>app/styles.css</code></td><td>${kb(sizes.stylesCss.bytes)}</td><td>${sizes.stylesCss.lines ?? na}</td></tr>
<tr><td><code>app/index.html</code></td><td>${kb(sizes.indexHtml.bytes)}</td><td>${sizes.indexHtml.lines ?? na}</td></tr>
<tr><td>Fetched libraries (<code>app/vendor</code>)</td><td>${kb(sizes.vendorBytes)}</td><td></td></tr>
<tr><td>Standalone page template</td><td>${kb(sizes.standaloneTemplateBytes)}</td><td></td></tr>
<tr><td><code>release/tests/app.spec.mjs</code></td><td></td><td>${sizes.testLines ?? na}</td></tr>
</tbody></table></div>

<h2>5. What this report does not tell you</h2>
<ul>${notes.map(n => "<li>" + esc(n) + "</li>").join("")}</ul>
<p class="muted">Raw results are in <code>raw/</code>; every figure above is also in <a href="kpis.json">kpis.json</a>.</p>
</main></body></html>
`;
fs.writeFileSync(path.join(REPORT, "index.html"), html);
