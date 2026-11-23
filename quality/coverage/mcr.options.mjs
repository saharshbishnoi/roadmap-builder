// What counts for coverage: the app's own script and stylesheet as served to the tests. The fetched libraries,
// the standalone copies opened from a folder and anything else are left out.
export default {
  name: "Roadmap Builder: code run by the browser tests",
  outputDir: "/report/coverage",
  reports: ["v8", "v8-json", "json-summary", "console-summary"],
  inline: true,
  entryFilter: e => /^http:\/\/127\.0\.0\.1:4173\/(app\.js|guide\.js|styles\.css)$/.test(e.url),
  sourcePath: p => p.replace(/^127\.0\.0\.1-4173\//, "app/")
};
