/* Service worker do Portal dos Bares — Grupo IZ (PLANO_APP_PWA.md, Fase 2).
 * network-first p/ HTML (fresco online, cache como reserva offline);
 * cache-first p/ assets (css/ícones/manifesto), revalidando em segundo plano.
 * Só GET — escrita (contagem/turno/registro) NÃO passa por aqui; a fila
 * offline durável entra na Fase 3. Caminhos relativos: funciona em localhost
 * e em /grupo-iz-dashboard/ (Pages). */
const CACHE = "iz-portal-v1";
const CORE = [
  "index.html",
  "portal.css",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-512-maskable.png",
  "apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;              // escrita não passa pelo SW
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Worker/KV externos: rede direta

  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
    );
  } else {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
