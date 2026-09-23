// Service worker Klontonk Dashboard.
//
// Strategi: NETWORK-FIRST (sama seperti klontonk_pos) -- saat online selalu ambil versi
// terbaru, cache hanya dipakai sebagai cadangan saat offline. Permintaan ke Supabase
// (domain lain) TIDAK pernah di-cache: data harus selalu segar.
//
// Pengaman: (1) cache versi lama dihapus saat CACHE_NAME dinaikkan, (2) jumlah entri runtime
// dibatasi, (3) pesan { type: 'CLEAR_CACHE' } dari halaman, (4) darurat: buka
// <alamat-dashboard>/index.html?reset-cache=1

const CACHE_NAME = 'klontonk-dashboard-v1';
const MAX_ENTRIES = 60;
const NETWORK_TIMEOUT_MS = 6000;
const RESET_PARAM = 'reset-cache';

// App shell untuk offline. Tambahkan berkas baru di sini (kalau terlewat, tetap ikut
// masuk cache saat pertama kali dimuat online).
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/auth.js',
  './js/config.js',
  './js/format.js',
  './js/lookups.js',
  './js/router.js',
  './js/supabase.js',
  './js/ui.js',
  './js/pages/login.js',
  './js/pages/ringkasan.js',
  './js/pages/klien.js',
  './js/pages/cabang.js',
  './js/pages/langganan.js',
  './js/pages/paket.js',
  './js/pages/pengguna.js',
  './js/pages/transaksi.js',
  './js/pages/retur.js',
  './js/pages/log-audit.js',
  './js/pages/log-teknis.js',
  './js/pages/pemakaian.js',
  './js/pages/pengaturan.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_ENTRIES) return;
  for (const key of keys.slice(0, keys.length - MAX_ENTRIES)) await cache.delete(key);
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS))
    ]);
    if (response && response.ok) {
      cache.put(request, response.clone()).then(() => trim(cache)).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // Supabase: jangan di-cache
  if (url.pathname.endsWith('/sw.js')) return;

  // Darurat: ?reset-cache=1 -> bersihkan cache lebih dulu, lalu ambil dari jaringan.
  if (url.searchParams.has(RESET_PARAM)) {
    event.respondWith((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      return fetch(request);
    })());
    return;
  }

  event.respondWith(networkFirst(request));
});

self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'CLEAR_CACHE') return;
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    const cache = await caches.open(CACHE_NAME);
    let done = 0;
    for (const url of PRECACHE) {
      try {
        await cache.add(new Request(url, { cache: 'reload' }));
        done++;
      } catch (err) { /* berkas belum ada: abaikan */ }
    }
    const port = event.ports && event.ports[0];
    if (port) port.postMessage({ ok: true, precached: done });
  })());
});