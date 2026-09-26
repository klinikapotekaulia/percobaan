/**
 * sw.js — Service Worker Aulia Apotek Klinik
 * Strategi: Cache shell statis, skip Firebase/CDN dynamic calls.
 */

var CACHE_NAME = 'aulia-v2.3'; // FIX v2.3: bump cache -- index.html berubah (tambah script imageUploader.js) & banyak modul js diperbarui sesi ini

var SHELL_URLS = [
    './',
    './index.html',
    './display.html',
    './manifest.json',
    './css/style.css',
    './css/tailwind.css',
    './css/win98.css',
    './icon-192.png',
    './icon-512.png',
    './logostruk.png',
    './js/app.js',
    './js/auth.js',
    './js/dashboard.js'
];

// Install: cache shell
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return Promise.all(
                SHELL_URLS.map(function (url) {
                    return cache.add(url).catch(function (err) {
                        console.warn('[SW] Tidak dapat cache:', url, err.message);
                    });
                })
            );
        }).then(function () {
            return self.skipWaiting();
        })
    );
});

// Activate: bersihkan cache lama
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys
                    .filter(function (k) { return k !== CACHE_NAME; })
                    .map(function (k) { return caches.delete(k); })
            );
        }).then(function () {
            return self.clients.claim();
        })
    );
});

// Fetch: stale-while-revalidate untuk file lokal; network-only untuk Firebase & CDN
self.addEventListener('fetch', function (event) {
    if (event.request.method !== 'GET') return;

    var url = new URL(event.request.url);

    // Jangan intercept Firebase, Google APIs, atau CDN eksternal
    // FIX (BUG GRAFIK "Tren Penjualan Periode" BLANK): 'unpkg.com' sebelumnya TIDAK
    // ada di daftar ini, padahal index.html memuat React, ReactDOM, & prop-types
    // (dipakai grafik Tren Penjualan/Recharts) dari unpkg.com. Akibatnya request ke
    // unpkg.com ikut "ditangkap" oleh fetch handler di bawah alih-alih dibiarkan lewat
    // apa adanya seperti CDN lain -- kalau fetch lintas-origin itu gagal/lambat
    // (paling sering terjadi tepat setelah migrasi domain, saat browser & SW registrasi
    // ulang tanpa cache lama), tidak ada 'cached' fallback utk request pertama, request
    // gagal total, window.React/ReactDOM tidak pernah ter-define, dan
    // renderDailySalesChart() di js/dashboard.js retry selamanya tanpa pernah berhasil
    // -> grafik selalu kosong. Menambahkan 'unpkg.com' di sini membuatnya konsisten
    // dengan CDN lain (network-only, tidak diintervensi SW).
    var bypassHosts = [
        'firestore.googleapis.com',
        'identitytoolkit.googleapis.com',
        'securetoken.googleapis.com',
        'googleapis.com',
        'cdn.tailwindcss.com',
        'cdn.jsdelivr.net',
        'cdn.sheetjs.com',
        'cdnjs.cloudflare.com',
        'unpkg.com',
        'gstatic.com'
    ];
    for (var i = 0; i < bypassHosts.length; i++) {
        if (url.hostname.indexOf(bypassHosts[i]) !== -1) return;
    }

    // Untuk file lokal: stale-while-revalidate
    event.respondWith(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.match(event.request).then(function (cached) {
                var fetchPromise = fetch(event.request).then(function (response) {
                    if (response && response.status === 200 &&
                        (response.type === 'basic' || response.type === 'cors')) {
                        // Jangan cache response HTML (index.html fallback) untuk file static non-HTML seperti .js atau .css
                        var contentType = response.headers.get('content-type') || '';
                        var isHtmlResponse = contentType.indexOf('text/html') !== -1;
                        var isHtmlRequest = event.request.url.indexOf('.html') !== -1 || 
                                            event.request.url === self.location.origin + '/' || 
                                            event.request.url === self.location.origin + '/index.html' ||
                                            event.request.url === self.location.origin + './';
                        
                        if (isHtmlResponse && !isHtmlRequest) {
                            // Jangan simpan fallback index.html ke dalam cache untuk file .js/.css/gambar
                        } else {
                            cache.put(event.request, response.clone());
                        }
                    }
                    return response;
                }).catch(function () {
                    return cached;
                });
                return cached || fetchPromise;
            });
        })
    );
});