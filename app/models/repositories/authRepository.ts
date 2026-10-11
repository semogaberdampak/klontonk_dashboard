import { supabase, createDetachedClient } from '~/models/supabase'
import { fail, ok, run, toAppError, type Result } from '~/models/result'
import { ADMIN_STORAGE_KEY } from '~/config'
import type { PlatformAdmin } from '~/models/types'

// Keputusan akses sesungguhnya ada di database: RLS + tabel platform_admins
// (db/dashboard-schema.sql). Pengecekan di sini hanya untuk tampilan.

interface AdminRow {
  id: string
  name: string
}

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export async function fetchAdmin(uid: string): Promise<Result<AdminRow | null>> {
  return run<AdminRow | null>(supabase.from('platform_admins').select('id,name').eq('id', uid).maybeSingle(), null)
}

export async function signIn(email: string, password: string): Promise<Result<{ uid: string }>> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return fail(toAppError(error))
    return data.user ? ok({ uid: data.user.id }) : fail(toAppError({ message: 'Login gagal. Coba lagi.' }, 500))
  } catch (error: unknown) {
    return fail(toAppError(error))
  }
}

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // Offline: sesi lokal tetap dibuang oleh supabase-js.
  }
}

/** Buat akun client baru TANPA mengganti sesi admin yang sedang aktif. */
export async function signUpDetached(email: string, password: string): Promise<Result<{ userId: string }>> {
  try {
    const { data, error } = await createDetachedClient().auth.signUp({ email, password })
    if (error) return fail(toAppError(error))
    return data.user ? ok({ userId: data.user.id }) : fail(toAppError({ message: 'Akun gagal dibuat. Coba lagi.' }, 500))
  } catch (error: unknown) {
    return fail(toAppError(error))
  }
}

/** Salinan admin untuk tampilan saat offline (localStorage bisa diblokir). */
export function readCachedAdmin(): PlatformAdmin | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEY) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null) return null
    const { id, name, email } = parsed as Partial<PlatformAdmin>
    return typeof id === 'string' && typeof name === 'string' ? { id, name, email: email ?? null } : null
  } catch {
    return null
  }
}

export function writeCachedAdmin(admin: PlatformAdmin | null): void {
  try {
    if (admin) localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin))
    else localStorage.removeItem(ADMIN_STORAGE_KEY)
  } catch {
    // diabaikan
  }
}
