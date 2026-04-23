const CACHE = 'dm-v5';

const ASSETS = [
  '/',
  '/index.html',
  '/project.html',
  '/contact.html',
  '/resume.html',
  '/404.html',
  '/css/main.css',
  '/css/tictactoe.css',
  '/css/connect.css',
  '/css/calendar.css',
  '/js/main.js',
  '/js/theme.js',
  '/js/project.js',
  '/js/connect.js',
  '/js/calendar.js',
  '/js/calendar-worker.js',
  '/fonts/inter-latin.woff2',
  '/fonts/poppins-600.woff2',
  '/fonts/poppins-700.woff2',
  '/fonts/poppins-800.woff2',
  '/images/profile.jpg',
  '/images/indiana-tech-sign.jpg',
  '/images/stickerlogo.png',
  '/files/minimax.png',
  '/files/alphabeta.png',
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  /* Only handle GET requests for same-origin or font/image assets */
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request).then(function (response) {
        /* Cache successful same-origin responses for future offline use */
        if (response.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(e.request, clone); });
        }
        return response;
      });
    }).catch(function () {
      /* If both cache and network fail, show the offline 404 page */
      return caches.match('/404.html');
    })
  );
});
