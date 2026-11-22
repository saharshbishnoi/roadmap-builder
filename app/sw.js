/* Offline support for the installed web app. The two placeholders below are filled in by the Docker build
   (assets/finish.sh): a version stamp, and the list of files that make up the app. */
const VERSION = "__BUILD__";
const FILES = [/*FILES*/];
const SHELL = "roadmap-app-" + VERSION, GUIDE = "roadmap-guide-" + VERSION;

self.addEventListener("install", e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== GUIDE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

/* The page asks for the guide videos of its current theme to be kept for offline use once the Guide is opened. */
self.addEventListener("message", e => {
  if (!e.data || e.data.type !== "keepGuide") return;
  e.waitUntil(caches.open(GUIDE).then(async c => {
    for (const url of e.data.urls) { try { if (!(await c.match(url))) { const r = await fetch(url); if (r.ok) await c.put(url, r); } } catch (x) { /* offline: try again next time */ } }
  }));
});

/* Video players ask for byte ranges; answer those from the stored copy. */
async function ranged(request, response) {
  const want = /bytes=(\d+)-(\d*)/.exec(request.headers.get("range") || "");
  if (!want) return response;
  const blob = await response.blob(), start = +want[1], end = want[2] ? Math.min(+want[2], blob.size - 1) : blob.size - 1;
  return new Response(blob.slice(start, end + 1), { status: 206, headers: { "Content-Type": response.headers.get("Content-Type") || "video/mp4",
    "Content-Range": "bytes " + start + "-" + end + "/" + blob.size, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" } });
}

self.addEventListener("fetch", e => {
  const request = e.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.indexOf("/guide/") >= 0) {   // guide media: stored copy first, otherwise the network
    e.respondWith(caches.open(GUIDE).then(c => c.match(url.href)).then(hit => hit ? ranged(request, hit) : fetch(request)));
    return;
  }
  // The app itself: the network first so a new version shows at once, the stored copy when offline.
  e.respondWith(fetch(request).catch(() => caches.open(SHELL).then(c => c.match(request, { ignoreSearch: true })).then(hit => hit || caches.open(SHELL).then(c => c.match("./")))));
});
