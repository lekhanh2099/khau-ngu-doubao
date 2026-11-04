const CACHE_NAME = "khau-ngu-v11";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data.js",
  "./manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // Audio dùng Range request khi stream/tua: để trình duyệt tự tải trực tiếp,
  // không đi qua Service Worker (tránh giật/khựng trên iOS Safari).
  const url = new URL(e.request.url);
  if (url.pathname.includes("/audio/") || e.request.headers.has("range")) return;

  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
