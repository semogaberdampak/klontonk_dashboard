import { rest, signIn, signOut, hasSession, sessionClaim } from './supabase.js';

// ============ AUTENTIKASI ADMIN PLATFORM ============
//
// Login dashboard memakai EMAIL + PASSWORD -- berbeda dari klontonk_pos yang memakai username
// (username dipetakan ke <username>@klontonk.local). Pemisahan ini disengaja: akun platform
// tidak bisa dipakai login ke aplikasi POS client, dan sebaliknya.
//
// Keputusan akses sesungguhnya ada di database: RLS + tabel platform_admins
// (db/dashboard-schema.sql). Pengecekan di berkas ini hanya untuk tampilan.

const STORE_KEY = 'klontonk:dash-admin';   // { id, name, email } -- hanya untuk tampilan

function readAdmin() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY));
    return parsed && parsed.id ? parsed : null;
  } catch (e) {
    return null;
  }
}

function writeAdmin(value) {
  try {
    if (value) localStorage.setItem(STORE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORE_KEY);
  } catch (e) { /* abaikan */ }
}

const COLUMNS = 'id,name';

export const Auth = {
  admin: null,
  _booted: null,

  // Dipanggil sekali saat aplikasi dibuka. Menunggu ini penting: tanpa menunggu,
  // status login dibaca terlalu dini dan admin selalu dilempar ke halaman login.
  ready() {
    if (!this._booted) this._booted = this._boot();
    return this._booted;
  },

  async _boot() {
    this.admin = readAdmin();

    if (!hasSession()) { this._clear(); return; }
    const uid = sessionClaim('sub');
    if (!uid) { this._clear(); return; }

    const result = await rest(`platform_admins?select=${COLUMNS}&id=eq.${uid}&limit=1`);
    if (result.ok) {
      if (!result.data.length) { this._clear(); return; }   // bukan admin platform
      this.admin = {
        id: result.data[0].id,
        name: result.data[0].name,
        email: this.admin && this.admin.id === uid ? this.admin.email : null
      };
      writeAdmin(this.admin);
      return;
    }

    // Offline: pakai salinan tersimpan asal masih milik pengguna yang sama (data tetap
    // dijaga RLS, jadi ini tidak membuka akses apa pun).
    if (result.status === 0 && this.admin && this.admin.id === uid) return;
    this._clear();
  },

  // Mengembalikan { success } atau { success:false, error }. Pesan error selalu generik
  // untuk mencegah penebakan akun (user enumeration).
  async login(email, password) {
    const mail = String(email || '').trim().toLowerCase();
    if (!mail || !password) return { success: false, error: 'Email dan password wajib diisi.' };

    const result = await signIn(mail, password);
    if (!result.ok) {
      if (result.status === 0) return { success: false, error: result.message };
      if (result.status === 429) return { success: false, error: 'Terlalu banyak percobaan. Coba lagi beberapa saat.' };
      if (result.status >= 500) return { success: false, error: 'Layanan sedang bermasalah. Coba lagi sebentar.' };
      return { success: false, error: 'Email atau password salah.' };
    }

    const uid = result.data && result.data.user ? result.data.user.id : null;
    if (!uid) { this._clear(); return { success: false, error: 'Login gagal. Coba lagi.' }; }

    const check = await rest(`platform_admins?select=${COLUMNS}&id=eq.${uid}&limit=1`);
    if (!check.ok) { this._clear(); return { success: false, error: check.message }; }
    if (!check.data.length) {
      this._clear();
      return { success: false, error: 'Akun ini bukan admin platform. Hubungi pemilik sistem.' };
    }

    this.admin = { id: uid, name: check.data[0].name, email: mail };
    writeAdmin(this.admin);
    return { success: true, admin: this.admin };
  },

  logout() { this._clear(); },

  // Sesi Supabase tidak berlaku lagi (401). Dipakai halaman saat menerima { expired: true }.
  expired() {
    this._clear();
    setTimeout(() => window.location.reload(), 900);
  },

  _clear() {
    this.admin = null;
    writeAdmin(null);
    signOut();   // sekaligus menghapus sesi Supabase
  },

  isAuthenticated() {
    return this.admin !== null && hasSession();
  },

  name() {
    return this.admin ? this.admin.name : 'Admin';
  }
};