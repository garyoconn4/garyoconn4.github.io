// The hosted page only. The app itself comes from Apps Script each time it opens.
// Network first for the page and config.js, so an update always reaches every phone; cache only when offline.
// This folder shares its website with StudyTime, so it only ever touches its own gid-shell- caches.
var CACHE = 'gid-shell-2';
var SHELL = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(SHELL.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () { }); }));
  }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('gid-shell-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }));
  self.clients.claim();
});
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; // Apps Script calls go straight to the network
  var page = r.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname);
  if (page || /\/config\.js$/.test(u.pathname)) {
    var key = page ? './' : './config.js';
    e.respondWith(fetch(r).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(key, copy); }); }
      return res;
    }).catch(function () { return caches.open(CACHE).then(function (c) { return c.match(key); }); }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(function (c) { return c.match(r); }).then(function (m) { return m || fetch(r); }));
});
