const CACHE_NAME = "khau-ngu-v22";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=22",
  "./app.js?v=22",
  "./data.js?v=22",
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
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.includes("/audio/") || e.request.headers.has("range")) return;

  // Network-first cho tài nguyên app để bản cập nhật hiển thị ngay, vẫn hỗ trợ offline
  e.respondWith(
    fetch(e.request)
      .then((netRes) => {
        if (netRes && netRes.ok) {
          const clone = netRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone)).catch(() => {});
        }
        return netRes;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
