// Builds the template for Export > Standalone page: the whole app as ONE html file (styles, scripts and fonts
// inlined) with three placeholders that the app fills in when someone exports: the page title, the fonts in use
// and the roadmap itself. Output: standalone-template.js, loaded by the app only when that export is used.
// Run by the Docker build (standalone stage):  node standalone.mjs <site folder> <output file>
import fs from "node:fs";
import path from "node:path";

const APP = process.argv[2] || "/site", OUT = process.argv[3] || path.join(APP, "standalone-template.js");
const read = f => fs.readFileSync(path.join(APP, f), "utf8");
const must = (text, found, what) => { if (!found) throw new Error("standalone.mjs: could not find " + what); return text; };

// Fonts: one block of @font-face rules per family, with the font files inside as data. The app picks the families in use.
const fonts = {};
let css = read("styles.css").replace(/@font-face\{font-family:"([^"]+)";([^}]*?)src:url\(([^)]+)\) format\("woff2"\)\}\n?/g, (m, family, rest, url) => {
  fonts[family] = (fonts[family] || "") + '@font-face{font-family:"' + family + '";' + rest + "src:url(data:font/woff2;base64," + fs.readFileSync(path.join(APP, url)).toString("base64") + ') format("woff2")}';
  return "";
});
must(css, Object.keys(fonts).length >= 5 && !/url\(/.test(css), "the font rules in styles.css");

let html = read("index.html"), n = 0;
const swap = (pattern, to, what) => { const before = html; html = html.replace(pattern, to); must(html, html !== before, what); };
swap(/<meta http-equiv="Content-Security-Policy"[^>]*>/, () => `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src data: blob:; media-src data: blob:; base-uri 'none'">`, "the security policy tag");
swap(/<link rel="manifest"[^>]*>\n?/, "", "the manifest link");
swap(/<link rel="icon"[^>]*>/, () => '<link rel="icon" href="data:image/svg+xml,' + encodeURIComponent(read("icon.svg")) + '">', "the icon link");
swap(/<title>[^<]*<\/title>/, () => "<title>@@ROADMAP_TITLE@@</title>", "the title");
swap('<link rel="stylesheet" href="styles.css">', () => "<style>@@ROADMAP_FONTS@@\n" + css + "</style>", "the stylesheet link");
swap("<body>", '<body class="standalone">', "the body tag");
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => { n++;
  return (n === 1 ? '<script type="application/json" id="roadmap-data">@@ROADMAP_DATA@@</script>\n' : "") + "<script>" + read(src).replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--") + "</script>"; });
must(html, n === 6, "the six script tags (found " + n + ")");
// Nothing outside the file may be linked. Inlined scripts are skipped: they contain markup as text.
must(html, !/<(script|link|img|video|source)[^>]+(src|href)="(?!data:)/.test(html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, "")), "a page with no outside files (something is still linked)");
["@@ROADMAP_TITLE@@", "@@ROADMAP_FONTS@@", "@@ROADMAP_DATA@@"].forEach(p => must(html, html.split(p).length === 2, "exactly one " + p));

fs.writeFileSync(OUT, "/* Made by the Docker build (assets/standalone.mjs). */\nwindow.STANDALONE_TEMPLATE=" + JSON.stringify({ html, fonts }) + ";\n");
console.log("standalone template: " + (fs.statSync(OUT).size / 1048576).toFixed(2) + " MB, page without fonts " + (html.length / 1024).toFixed(0) + " KB, fonts: " + Object.keys(fonts).join(", "));
