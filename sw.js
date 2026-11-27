// 화면 파일만 담아 둔다(앱 아이콘은 각 앱 주소에서 바로 불러옴). 새 버전은 CACHE 와 ?v= 함께 올리기.
const CACHE = 'app-hub-v5';
const FILES = ['./', 'index.html', 'assets/app.css?v=5', 'assets/app.js?v=5', 'data/apps.json', 'manifest.webmanifest', 'assets/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (e.request.mode === 'navigate' || u.pathname.endsWith('/data/apps.json')) { // 목록은 새것 먼저
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(e.request).then((m) => m || fetch(e.request)));
});
