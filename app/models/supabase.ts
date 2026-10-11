import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createDemoClient } from '~/models/demoClient'
import { REQUEST_TIMEOUT_MS, SESSION_STORAGE_KEY, runtimeSettings } from '~/config'

// fetch dengan batas waktu: server yang tidak menjawab tidak boleh membuat layar menunggu selamanya.
const fetchWithTimeout: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store', signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) })

function requireCredentials(): { url: string; key: string } {
  const { supabaseUrl, supabaseKey } = runtimeSettings()
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Pengaturan Supabase belum diisi (NUXT_PUBLIC_SUPABASE_URL / NUXT_PUBLIC_SUPABASE_KEY).')
  }
  return { url: supabaseUrl, key: supabaseKey }
}

let client: SupabaseClient | null = null

function build(): SupabaseClient {
  if (runtimeSettings().demoMode) return createDemoClient() as unknown as SupabaseClient
  const { url, key } = requireCredentials()
  return createClient(url, key, {
    auth: { storageKey: SESSION_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout }
  })
}

const getClient = (): SupabaseClient => (client ??= build())

/**
 * Klien utama (membawa sesi admin platform). Dibuat saat PERTAMA dipakai, setelah plugin runtime
 * mengisi pengaturan, sehingga repository cukup memakai `supabase.from(...)` seperti biasa.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const instance = getClient()
    const value: unknown = Reflect.get(instance, property)
    return typeof value === 'function' ? value.bind(instance) : value
  }
})

/**
 * Klien tanpa sesi. Dipakai untuk mendaftarkan akun client baru TANPA menimpa sesi admin yang
 * sedang aktif. (Akun tanpa baris di tabel `profiles` tidak punya akses apa pun, jadi aman.)
 */
export function createDetachedClient(): SupabaseClient {
  if (runtimeSettings().demoMode) return createDemoClient() as unknown as SupabaseClient
  const { url, key } = requireCredentials()
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout }
  })
}
