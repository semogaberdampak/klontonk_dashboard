import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

// Klien ringan Supabase (Auth + PostgREST) memakai fetch biasa, tanpa pustaka -- pendekatan
// yang sama dengan klontonk_pos, ditambah paginasi + hitung total untuk tabel dashboard.
// Semua fungsi mengembalikan { ok, status, data } atau { ok:false, status, code, message }
// dan tidak pernah melempar error. status 0 = tidak ada jaringan / server tidak menjawab.

const SESSION_KEY = 'klontonk:dash-session';   // { access_token, refresh_token, expires_at (detik) }
const REFRESH_MARGIN_S = 60;
const REQUEST_TIMEOUT_MS = 25000;

// ---------- Sesi (localStorage bisa diblokir) ----------

function readSession() {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY));
    return stored && stored.access_token && stored.refresh_token ? stored : null;
  } catch (e) {
    return null;
  }
}

function writeSession(value) {
  try {
    if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else localStorage.removeItem(SESSION_KEY);
  } catch (e) { /* abaikan */ }
}

let session = readSession();
let refreshing = null;

export const hasSession = () => session !== null;

export function clearSession() {
  session = null;
  writeSession(null);
}

const toSession = (data) => ({
  access_token: data.access_token,
  refresh_token: data.refresh_token,
  expires_at: data.expires_at || Math.floor(Date.now() / 1000) + data.expires_in
});

// ---------- Permintaan mentah ----------

function describeError(status, body) {
  const message = (body && (body.message || body.msg || body.error_description || body.error))
    || `Permintaan gagal (kode ${status}).`;
  const code = body && (body.error_code || body.code);
  return { status, code: code ? String(code) : '', message };
}

async function raw(path, { method = 'GET', body, token, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(SUPABASE_URL + path, {
      method,
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        apikey: SUPABASE_KEY,
        ...(token && { Authorization: 'Bearer ' + token }),
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...headers
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (e) {
    return { ok: false, status: 0, code: 'network', message: 'Server tidak terjangkau. Periksa koneksi lalu coba lagi.', headers: null };
  }

  const text = await response.text().catch(() => '');
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (e) { data = text; }
  }
  if (response.ok) return { ok: true, status: response.status, data, headers: response.headers };
  return { ok: false, ...describeError(response.status, data), headers: response.headers };
}

// ---------- Token: diperbarui otomatis sebelum kadaluarsa ----------

async function refreshSession() {
  if (!session) return false;
  const result = await raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } });
  if (result.ok) {
    session = toSession(result.data);
    writeSession(session);
    return true;
  }
  if (result.status === 0 || result.status >= 500) return false;   // offline / gangguan: coba lagi nanti
  clearSession();                                                   // ditolak: sesi tidak berlaku lagi
  return false;
}

function refreshOnce() {
  if (!refreshing) refreshing = refreshSession().finally(() => { refreshing = null; });
  return refreshing;
}

async function freshToken() {
  if (!session) return null;
  if (session.expires_at - Date.now() / 1000 <= REFRESH_MARGIN_S) await refreshOnce();
  return session ? session.access_token : null;
}

// Permintaan atas nama pengguna yang login. `expired: true` bila sesi sudah tidak berlaku.
export async function request(path, options = {}) {
  const token = await freshToken();
  let result = await raw(path, { ...options, token: token || undefined });
  if (result.status === 401 && session) {
    if (await refreshOnce()) result = await raw(path, { ...options, token: session.access_token });
  }
  return result.status === 401 ? { ...result, expired: true } : result;
}

export const rest = (path, options) => request('/rest/v1/' + path, options);
export const rpc = (name, args) => request('/rest/v1/rpc/' + name, { method: 'POST', body: args === undefined ? {} : args });

// ---------- Paginasi ----------

// Satu halaman + total baris. Content-Range dari server: "0-49/1234".
export async function page(path, { from = 0, to = 49, count = true } = {}) {
  const headers = { Range: `${from}-${to}`, 'Range-Unit': 'items' };
  if (count) headers.Prefer = 'count=exact';
  const result = await rest(path, { headers });
  if (!result.ok) return result;
  const range = result.headers ? (result.headers.get('content-range') || '') : '';
  const total = Number(String(range).split('/')[1]);
  return {
    ok: true,
    status: result.status,
    data: Array.isArray(result.data) ? result.data : [],
    total: Number.isFinite(total) ? total : (Array.isArray(result.data) ? result.data.length : 0)
  };
}

// Ambil seluruh baris (hanya untuk daftar acuan kecil: clients, plans, tenants).
export async function fetchAll(path) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const result = await page(path, { from, to: from + 499, count: false });
    if (!result.ok) return result;
    rows.push(...result.data);
    if (result.data.length < 500) return { ok: true, status: 200, data: rows };
  }
}

// ---------- Auth ----------

export async function signIn(email, password) {
  const result = await raw('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
  if (result.ok) {
    session = toSession(result.data);
    writeSession(session);
  }
  return result;
}

export async function signOut() {
  const token = session && session.access_token;
  clearSession();
  if (token) await raw('/auth/v1/logout?scope=local', { method: 'POST', token });
}

// Buat akun client baru TANPA mengganti sesi admin yang sedang aktif.
// (Akun tanpa baris di tabel `profiles` tidak punya akses apa pun, jadi aman.)
export const signUpDetached = (email, password) => raw('/auth/v1/signup', { method: 'POST', body: { email, password } });

// ---------- Baca isi token (hanya untuk tampilan; keputusan akses tetap di RLS) ----------

function decodeJwt(token) {
  try {
    const part = String(token || '').split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (ch) => ch.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (e) {
    return null;
  }
}

export function sessionClaim(name) {
  const payload = session ? decodeJwt(session.access_token) : null;
  return payload ? payload[name] : null;
}
// Pesan siap tampil untuk kesalahan yang paling sering muncul.
export function pesanError(hasil) {
  if (!hasil) return 'Gagal. Coba lagi.';
  if (hasil.expired) return 'Sesi berakhir. Silakan login ulang.';
  if (hasil.code === '23505') return 'Data dengan kunci yang sama sudah ada.';
  if (hasil.code === '23503') return 'Masih terhubung dengan data lain, jadi tidak bisa diubah atau dihapus.';
  if (hasil.code === '23514') return 'Nilai yang dimasukkan tidak memenuhi aturan database.';
  if (hasil.status === 403 || hasil.code === '42501') return 'Tidak punya hak untuk tindakan ini.';
  if (hasil.status === 0) return hasil.message || 'Server tidak terjangkau. Periksa koneksi.';
  return hasil.message || 'Gagal menyimpan. Coba lagi.';
}