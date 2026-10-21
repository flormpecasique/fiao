// Fiao: guarda la app en el dispositivo para que abra rápido y sin internet.
const CACHE = "fiao-3809197190";
const CORE = [
  "/", "/app.css?v=3809197190", "/app.js?v=3809197190", "/manifest.webmanifest",
  "/icon.svg", "/icon-192.png", "/apple-touch-icon.png",
  "/fonts/figtree-var.woff2", "/fonts/kalam-700.woff2", "/fonts/plexmono-400.woff2", "/fonts/plexmono-600.woff2"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("fiao-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // nunca toca peticiones a otros sitios

  // La página: primero la red (para recibir actualizaciones); sin conexión, la copia guardada.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("/", copy)); } return res; })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Archivos propios: la copia guardada primero; si falta, se descarga y se guarda.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
