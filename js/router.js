import { UI } from './ui.js';

// ============ ROUTER BERBASIS HASH ============
// Kontrak halaman: { render(params) -> string|Promise<string>, init(params) -> void|Promise<void> }.
// render() boleh async (menunggu data), init() dipanggil setelah HTML terpasang ke DOM.

let activeRouter = null;

export class Router {
  constructor({ onRoute = null } = {}) {
    this.routes = new Map();
    this.mainEl = document.getElementById('appMain');
    this.token = 0;
    activeRouter = this;
    this.onRoute = onRoute;
    this.notFound = {
      render: () => UI.errorBox('Halaman tidak ditemukan. Pilih menu di kiri.', { title: '404' })
    };
  }

  // Muat ulang halaman yang sedang tampil dari halaman lain (setelah simpan/hapus).
  reload() {
    if (activeRouter) activeRouter.resolve();
  }

  add(path, page) {
    this.routes.set(path, page);
    return this;
  }

  start() {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  }

  static currentPath() {
    const hash = window.location.hash.replace(/^#/, '');
    const bersih = hash.split('?')[0];
    return bersih || '/ringkasan';
  }

  static currentParams() {
    const hash = window.location.hash.replace(/^#/, '');
    const posisi = hash.indexOf('?');
    return new URLSearchParams(posisi >= 0 ? hash.slice(posisi + 1) : '');
  }

  // Pindah halaman. params berupa objek biasa, mis. { client: 'C0001' }.
  static go(path, params = null) {
    const query = params ? new URLSearchParams(params).toString() : '';
    window.location.hash = path + (query ? '?' + query : '');
  }

  // Muat ulang halaman yang sedang tampil (dipakai tombol "Muat ulang").
  reload() { this.resolve(); }

  async resolve() {
    const path = Router.currentPath();
    const params = Router.currentParams();
    const page = this.routes.get(path) || this.notFound;
    const token = ++this.token;

    this.mainEl.innerHTML = UI.loading();

    let html = '';
    try {
      html = await page.render(params);
    } catch (e) {
      console.error('[Router] Gagal merender halaman', path, e);
      html = UI.errorBox(String((e && e.message) || e));
    }

    // Navigasi lain sudah berjalan sementara data dimuat: jangan timpa.
    if (token !== this.token) return;

    this.mainEl.innerHTML = html;
    if (this.onRoute) this.onRoute(path, page);

    if (page.init) {
      try {
        await page.init(params);
      } catch (e) {
        console.error('[Router] Gagal menyiapkan halaman', path, e);
        UI.toast('Sebagian tampilan gagal disiapkan. Coba muat ulang.', { type: 'danger' });
      }
    }
  }
}

// Dipakai halaman lain untuk memuat ulang tampilan setelah menyimpan/menghapus data.
export function reloadPage() {
  if (activeRouter) activeRouter.resolve();
}
