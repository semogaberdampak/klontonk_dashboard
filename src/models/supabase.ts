import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createDemoClient } from '@/models/demoClient'
import { DEMO_MODE, REQUEST_TIMEOUT_MS, SESSION_STORAGE_KEY, SUPABASE_KEY, SUPABASE_URL } from '@/config'

// fetch dengan batas waktu: server yang tidak menjawab tidak boleh membuat layar menunggu selamanya.
const fetchWithTimeout: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store', signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) })

/** Klien utama: membawa sesi admin platform (disimpan supabase-js di localStorage). */
export const supabase: SupabaseClient = DEMO_MODE
  ? (createDemoClient() as unknown as SupabaseClient)
  : createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { storageKey: SESSION_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      global: { fetch: fetchWithTimeout }
    })

/**
 * Klien tanpa sesi. Dipakai untuk mendaftarkan akun client baru TANPA menimpa sesi admin yang
 * sedang aktif. (Akun tanpa baris di tabel `profiles` tidak punya akses apa pun, jadi aman.)
 */
export const createDetachedClient = (): SupabaseClient =>
  DEMO_MODE
    ? (createDemoClient() as unknown as SupabaseClient)
    : createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout }
  })
