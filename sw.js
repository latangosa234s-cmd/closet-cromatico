// Offline support: the app shell is cached on install; the AI model and fonts are cached the first time they load.
const SHELL = "closet-shell-v1";
const RUNTIME = "closet-runtime-v1";
const SHELL_FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];
const RUNTIME_HOSTS = ["cdn.jsdelivr.net", "staticimgly.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // App pages: network first so updates arrive, cache when offline.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => { if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)).catch(() => {}); } return res; })
        .catch(() => caches.match(req).then(hit => hit || caches.match("index.html")))
    );
    return;
  }

  // Versioned libraries, model files and fonts never change: cache first.
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(RUNTIME).then(c => c.put(req, copy)).catch(() => {}); }
        return res;
      }))
    );
  }
});
