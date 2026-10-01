/**
 * sw.js — Service Worker Aulia Apotek Klinik
 * Strategi: Cache shell statis, skip Firebase/CDN dynamic calls.
 * Dynamic JavaScript menggunakan network-first agar update modul langsung terlihat.
 */
var CACHE_NAME = 'aulia-v2.10';
var SHELL_URLS = ['./','./index.html','./display.html','./manifest.json','./css/style.css','./css/tailwind.css','./css/win98.css','./icon-192.png','./icon-512.png','./logostruk.png','./js/app.js','./js/auth.js','./js/dashboard.js'];

self.addEventListener('install', function (event) {
    event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
        return Promise.all(SHELL_URLS.map(function (url) {
            return cache.add(url).catch(function (err) { console.warn('[SW] Tidak dapat cache:', url, err.message); });
        }));
    }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
    event.waitUntil(caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
    if (event.request.method !== 'GET') return;
    var url = new URL(event.request.url);
    var bypassHosts = ['firestore.googleapis.com','identitytoolkit.googleapis.com','securetoken.googleapis.com','googleapis.com','cdn.tailwindcss.com','cdn.jsdelivr.net','cdn.sheetjs.com','cdnjs.cloudflare.com','unpkg.com','gstatic.com'];
    for (var i = 0; i < bypassHosts.length; i++) if (url.hostname.indexOf(bypassHosts[i]) !== -1) return;

    var isSameOrigin = url.origin === self.location.origin;
    var isJavaScript = /\.js$/i.test(url.pathname);

    event.respondWith(caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(event.request).then(function (cached) {
            // JavaScript modul adalah aset yang sering berubah. Ambil versi
            // terbaru dari server terlebih dahulu, lalu gunakan cache hanya
            // sebagai fallback ketika jaringan gagal.
            if (isSameOrigin && isJavaScript) {
                return fetch(event.request).then(function (response) {
                    if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                }).catch(function () {
                    return cached || fetch(event.request);
                });
            }

            var fetchPromise = fetch(event.request).then(function (response) {
                if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
                    var contentType = response.headers.get('content-type') || '';
                    var isHtmlResponse = contentType.indexOf('text/html') !== -1;
                    var isHtmlRequest = event.request.url.indexOf('.html') !== -1 || event.request.url === self.location.origin + '/' || event.request.url === self.location.origin + '/index.html' || event.request.url === self.location.origin + './';
                    if (!(isHtmlResponse && !isHtmlRequest)) cache.put(event.request, response.clone());
                }
                return response;
            }).catch(function () { return cached; });
            return cached || fetchPromise;
        });
    }));
});