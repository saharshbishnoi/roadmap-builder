// Minimal static file server for the app folder, used by the tests and the video builder.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4", ".vtt": "text/vtt; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };

export function serve(root, port) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(root, p);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(port, "127.0.0.1", () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = +(process.argv[2] || 4173), root = process.argv[3] || process.env.APP_DIR || "../app";
  serve(root, port).then(() => console.log("Serving " + root + " on http://127.0.0.1:" + port));
}
