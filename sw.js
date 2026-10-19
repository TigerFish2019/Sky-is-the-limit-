// Hunter Systeem – offline cache. Verhoog VERSION bij een nieuwe versie van de app.
const VERSION = "hoogtepunt-v3";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      try { const res = await fetch(e.request); c.put(e.request, res.clone()); return res; } catch (err) { return new Response("", {status: 504}); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // De app zelf: eerst online (zodat je altijd de nieuwste versie krijgt), offline uit de cache
  if (e.request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html")) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      try { const res = await fetch(e.request, {cache: "no-store"}); if (res.ok) c.put("index.html", res.clone()); return res; }
      catch (err) { return (await c.match("index.html")) || (await c.match("./")); }
    })());
    return;
  }
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(e.request, {ignoreSearch: true});
    const net = fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => null);
    return hit || (await net);
  }));
});
