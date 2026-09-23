import { APP_VERSION, SUPABASE_URL } from './config.js';
import { Auth } from './auth.js';
import { UI } from './ui.js';
import { Router } from './router.js';
import { Lookups } from './lookups.js';
import { initialOf } from './format.js';

import { renderLogin, initLogin } from './pages/login.js';
import ringkasan from './pages/ringkasan.js';
import pemakaian from './pages/pemakaian.js';
import klien from './pages/klien.js';
import cabang from './pages/cabang.js';
import langganan from './pages/langganan.js';
import paket from './pages/paket.js';
import pengguna from './pages/pengguna.js';
import transaksi from './pages/transaksi.js';
import retur from './pages/retur.js';
import logAudit from './pages/log-audit.js';
import logTeknis from './pages/log-teknis.js';
import pengaturan from './pages/pengaturan.js';

// ============ MENU SISI ============
const NAV = [
  { group: 'Pemantauan', items: [
    { path: '/ringkasan', label: 'Ringkasan' },
    { path: '/pemakaian', label: 'Pemakaian' }
  ] },
  { group: 'Klien', items: [
    { path: '/klien', label: 'Klien' },
    { path: '/cabang', label: 'Cabang' }
  ] },
  { group: 'Langganan', items: [
    { path: '/langganan', label: 'Langganan' },
    { path: '/paket', label: 'Paket' }
  ] },
  { group: 'Pengguna', items: [
    { path: '/pengguna', label: 'Akun client' }
  ] },
  { group: 'Data client (baca saja)', items: [
    { path: '/transaksi', label: 'Transaksi' },
    { path: '/retur', label: 'Retur' }
  ] },
  { group: 'Log', items: [
    { path: '/log-audit', label: 'Log audit' },
    { path: '/log-teknis', label: 'Log teknis' }
  ] },
  { group: 'Sistem', items: [
    { path: '/pengaturan', label: 'Pengaturan' }
  ] }
];

// ============ JUDUL HALAMAN ============
const TITLES = {
  '/ringkasan': ['Ringkasan', 'Kondisi seluruh client dalam satu layar.'],
  '/pemakaian': ['Pemakaian', 'Aktivitas harian per client: transaksi, retur, log, dan error.'],
  '/klien': ['Klien', 'Pelanggan berlangganan -- pemilik satu atau beberapa cabang.'],
  '/cabang': ['Cabang', 'Cabang (tenant) milik setiap client.'],
  '/langganan': ['Langganan', 'Masa berlaku dan status paket setiap client.'],
  '/paket': ['Paket', 'Harga dan batas jumlah cabang/pengguna.'],
  '/pengguna': ['Akun client', 'Akun admin dan kasir milik client.'],
  '/transaksi': ['Transaksi', 'Riwayat penjualan seluruh cabang (baca saja).'],
  '/retur': ['Retur', 'Riwayat retur barang seluruh cabang (baca saja).'],
  '/log-audit': ['Log audit', 'Siapa mengubah apa dan kapan -- dicatat otomatis oleh database.'],
  '/log-teknis': ['Log teknis', 'Error/peringatan yang dikirim aplikasi POS di perangkat client.'],
  '/pengaturan': ['Pengaturan', 'Informasi sistem, retensi log, dan cache aplikasi.']
};

// ============ RUTE ============
const ROUTES = [
  ['/ringkasan', ringkasan],
  ['/pemakaian', pemakaian],
  ['/klien', klien],
  ['/cabang', cabang],
  ['/langganan', langganan],
  ['/paket', paket],
  ['/pengguna', pengguna],
  ['/transaksi', transaksi],
  ['/retur', retur],
  ['/log-audit', logAudit],
  ['/log-teknis', logTeknis],
  ['/pengaturan', pengaturan]
];

let router = null;
let currentPage = null;

// ---------- Navigasi sisi ----------
function buildNav() {
  const nav = document.getElementById('sidebarNav');
  const html = NAV.map((blok) => `
    <p class="nav-group">${UI.escape(blok.group)}</p>
    ${blok.items.map((item) => `<button type="button" class="nav-item" data-nav="${UI.escape(item.path)}">
      <span>${UI.escape(item.label)}</span></button>`).join('')}
  `).join('');
  nav.innerHTML = html;
  nav.querySelectorAll('[data-nav]').forEach((tombol) => {
    tombol.addEventListener('click', () => Router.go(tombol.dataset.nav));
  });
}

function markActive(path) {
  document.querySelectorAll('[data-nav]').forEach((tombol) => {
    const sama = tombol.dataset.nav === path;
    tombol.classList.toggle('active', sama);
    tombol.setAttribute('aria-current', sama ? 'page' : 'false');
  });
  const judul = TITLES[path] || ['Klontonk Dashboard', ''];
  document.getElementById('pageTitle').textContent = judul[0];
  document.getElementById('pageSubtitle').textContent = judul[1];
  document.title = judul[0] + ' - Klontonk Dashboard';
}

function renderUser() {
  const admin = Auth.admin || {};
  document.getElementById('userName').textContent = admin.name || 'Admin';
  document.getElementById('userAvatar').textContent = initialOf(admin.name || 'Admin');
}

// ---------- Status koneksi ----------
async function checkConnection() {
  const state = document.getElementById('connState');
  const teks = document.getElementById('connText');
  const mulai = Date.now();
  try {
    // mode 'no-cors': cukup tahu server menjawab, isi jawaban tidak dibaca.
    await fetch(SUPABASE_URL + '/auth/v1/health', { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(12000) });
    state.dataset.state = 'ok';
    teks.textContent = `Tersambung \u00b7 ${Date.now() - mulai} ms`;
  } catch (e) {
    state.dataset.state = 'bad';
    teks.textContent = 'Supabase tidak terjangkau';
  }
}

// ---------- Service worker (bisa offline untuk membaca) ----------
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .register('./sw.js', { updateViaCache: 'none' })
    .catch((err) => console.warn('[PWA] Service worker gagal didaftarkan:', err));
}

// ---------- Tombol kerangka aplikasi ----------
function bindShell() {
  document.getElementById('refreshBtn').addEventListener('click', () => {
    Lookups.invalidate();
    if (router) router.reload();
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    const yakin = await UI.modal({
      title: 'Keluar',
      message: 'Keluar dari dashboard sekarang?',
      icon: 'warning',
      confirmText: 'Ya, Keluar',
      cancelText: 'Batal',
      variant: 'danger'
    });
    if (!yakin) return;
    Auth.logout();
    setTimeout(() => window.location.reload(), 300);
  });

  window.addEventListener('online', checkConnection);
  window.addEventListener('offline', () => {
    document.getElementById('connState').dataset.state = 'bad';
    document.getElementById('connText').textContent = 'Tidak ada koneksi';
  });

  // Kesalahan tak terduga: cukup tampilkan di console, jangan menganggu pekerjaan.
  window.addEventListener('unhandledrejection', (e) => console.error('[Dashboard] Promise ditolak:', e.reason));
}

  // Satu listener untuk seluruh halaman: meneruskan klik [data-act] ke halaman yang aktif.
  // Cara ini mencegah penumpukan listener ketika berpindah halaman.
  document.getElementById('appMain').addEventListener('click', (event) => {
    const tombol = event.target.closest('[data-act]');
    if (!tombol || !currentPage || typeof currentPage.act !== 'function') return;
    currentPage.act(tombol.dataset.act, tombol.dataset.id, tombol, event);
  });
function showLogin() {
  document.getElementById('app').hidden = true;
  document.getElementById('loginRoot').innerHTML = renderLogin();
  initLogin();
}

// ---------- Mulai ----------
async function boot() {
  document.getElementById('appVersion').textContent = APP_VERSION;

  await Auth.ready();

  if (!Auth.isAuthenticated()) {
    showLogin();
    return;
  }

  document.getElementById('app').hidden = false;
  document.getElementById('loginRoot').innerHTML = '';
  renderUser();
  buildNav();
  bindShell();
  registerServiceWorker();
  markActive(Router.currentPath());
  checkConnection();

  const acuan = await Lookups.load();
  if (!acuan.success) {
    if (acuan.expired) {
      UI.toast('Sesi berakhir. Silakan login ulang.', { type: 'warning' });
      Auth.logout();
      setTimeout(() => window.location.reload(), 900);
      return;
    }
    UI.toast(`Daftar acuan belum bisa dimuat: ${acuan.error}`, { type: 'danger', duration: 8000 });
  }

  router = new Router({ onRoute: (path, page) => { markActive(path); currentPage = page; } });
  ROUTES.forEach(([path, page]) => router.add(path, page));
  router.start();
}

boot();