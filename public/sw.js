// Service worker do Nossa Casa. Só cacheia GET do mesmo domínio;
// chamadas ao Supabase (outro domínio) passam direto pela rede.
const VERSION = "v1";
const CACHE = "nossa-casa-" + VERSION;
const SCOPE = self.registration.scope; // termina com "/"

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([SCOPE, SCOPE + "app.js", SCOPE + "manifest.webmanifest", SCOPE + "icons/icon-192.png"]).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("nossa-casa-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Páginas e app.js: rede primeiro (pega atualizações), cache como fallback offline.
  if (req.mode === "navigate" || url.pathname.endsWith("/app.js")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(SCOPE)))
    );
    return;
  }

  // Demais arquivos estáticos (_next/static, ícones, CSS): cache primeiro.
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
