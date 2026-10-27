/* ============================================================================
   StudyTime . sw.js . offline support. Pages and config.js are network
   first, so a redeploy always reaches phones that already installed the
   app, and fall back to the cache with no signal (today's plan and the
   focus timer still work). Icons and the PDF and Excel libraries are cache
   first. Calls to Apps Script are never cached: the app queues changes
   itself and sends them when the signal is back.
   ========================================================================== */
const VERSION = '6327b5f912';
const CORE = 'st-core-' + VERSION;
const CDN = 'st-cdn-v1';
const PAGES = ['./student.html', './parent.html', './admin.html', './index.html', './privacy.html', './config.js'];
const STATIC = ['./manifest-student.json', './manifest-parent.json', './icons/student-192.png', './icons/student-512.png', './icons/parent-192.png', './icons/parent-512.png', './icons/student-180.png', './icons/parent-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CORE).then(c => Promise.all(PAGES.concat(STATIC).map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.indexOf('st-core-') === 0 && k !== CORE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return;
  const same = url.origin === location.origin;
  const isPage = req.mode === 'navigate' || (same && /(\.html|\/|config\.js)$/.test(url.pathname));
  if (isPage) {
    e.respondWith(fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CORE).then(c => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./student.html'))));
    return;
  }
  if (!same && !/(cdnjs\.cloudflare\.com)$/.test(url.hostname)) return;
  e.respondWith(caches.open(same ? CORE : CDN).then(c => c.match(req).then(hit => {
    const fresh = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || fresh;
  })));
});
