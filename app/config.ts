// Konstanta aplikasi. Nilai yang berbeda per lingkungan (URL Supabase, kunci publishable, mode demo)
// TIDAK di sini: dibaca dari runtimeConfig (nuxt.config.ts) oleh plugin 00.runtime.client.ts.

// Versi aplikasi -- naikkan bersama CACHE_NAME di public/sw.js saat rilis.
export const APP_VERSION = '3.0.0'

// Jumlah baris per halaman tabel (ditampilkan di halaman Pengaturan).
export const PAGE_SIZE = 50

// Domain email internal. Supabase Auth memerlukan email, sedangkan kasir login memakai
// username -- jadi akun client dibuat dengan email <username>@klontonk.local.
// NILAI INI HARUS SAMA dengan EMAIL_DOMAIN di klontonk_pos/js/config.js, kalau berbeda
// maka akun yang dibuat di sini tidak bisa dipakai login di aplikasi POS.
export const EMAIL_DOMAIN = 'klontonk.local'

export const REQUEST_TIMEOUT_MS = 25_000
export const SESSION_STORAGE_KEY = 'klontonk:dash-session'
export const ADMIN_STORAGE_KEY = 'klontonk:dash-admin'

export interface RuntimeSettings {
  supabaseUrl: string
  supabaseKey: string
  demoMode: boolean
}

let settings: RuntimeSettings = { supabaseUrl: '', supabaseKey: '', demoMode: false }

export const setRuntimeSettings = (next: RuntimeSettings): void => {
  settings = { ...next }
}

export const runtimeSettings = (): Readonly<RuntimeSettings> => settings
