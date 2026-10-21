/* HyperPKPD Tutor service worker: makes the app installable and usable offline.
   The page registers it as sw.js?v=<app version>, so every release gets a fresh cache. */
const VERSION = new URL(self.location.href).searchParams.get('v') || '0';
const CACHE = `hyperpkpd-tutor-${VERSION}`;
const SCOPE = new URL('./', self.location.href).pathname; // e.g. /tutor/

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Pre-cache the page plus the hashed JS/CSS it references so the very first offline visit works.
    const res = await fetch(SCOPE, { cache: 'reload' });
    const html = await res.clone().text();
    await cache.put(SCOPE, res);
    const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1])
      .filter((u) => u.startsWith(SCOPE) && !u.endsWith('/'));
    await Promise.all([...new Set(urls)].map((u) => cache.add(u).catch(() => undefined)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('hyperpkpd-tutor-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  if (url.pathname === `${SCOPE}sw.js`) return;

  // Page: network first (always the latest release when online), cached copy when offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh.ok) (await caches.open(CACHE)).put(SCOPE, fresh.clone());
        return fresh;
      } catch {
        return (await caches.match(SCOPE)) || Response.error();
      }
    })());
    return;
  }

  // Hashed build assets never change: cache first. Everything else (icons, manifest): stale-while-revalidate.
  const immutable = url.pathname.startsWith(`${SCOPE}assets/`);
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit && immutable) return hit;
    const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => undefined);
    return hit || (await net) || Response.error();
  })());
});
