import { supabase } from '~/models/supabase'
import * as authRepository from '~/models/repositories/authRepository'
import type { PlatformAdmin } from '~/models/types'

// Login dashboard memakai EMAIL + PASSWORD -- berbeda dari klontonk_pos yang memakai username
// (username dipetakan ke <username>@klontonk.local). Pemisahan ini disengaja: akun platform
// tidak bisa dipakai login ke aplikasi POS client, dan sebaliknya.

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated'
export type LoginResult = { success: true; admin: PlatformAdmin } | { success: false; error: string }

let subscribed = false
let expiring = false
let booting: Promise<void> | null = null

export function useAuth() {
  const status = useState<AuthStatus>('auth-status', () => 'loading')
  const admin = useState<PlatformAdmin | null>('auth-admin', () => null)
  const { toast } = useToast()

  const clear = async (): Promise<void> => {
    authRepository.writeCachedAdmin(null)
    admin.value = null
    status.value = 'anonymous'
    await authRepository.signOut()
  }

  const subscribe = (): void => {
    if (subscribed) return
    subscribed = true
    // Sesi dibuang supabase-js (refresh token ditolak, logout di tab lain) -> kembali ke login.
    supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_OUT') return
      authRepository.writeCachedAdmin(null)
      admin.value = null
      status.value = 'anonymous'
    })
  }

  const runBoot = async (): Promise<void> => {
    const cached = authRepository.readCachedAdmin()
    const uid = await authRepository.currentUserId()
    if (!uid) return clear()

    const check = await authRepository.fetchAdmin(uid)
    if (check.ok) {
      if (!check.data) return clear() // bukan admin platform
      const restored: PlatformAdmin = {
        id: check.data.id,
        name: check.data.name,
        email: cached?.id === uid ? cached.email : null
      }
      authRepository.writeCachedAdmin(restored)
      admin.value = restored
      status.value = 'authenticated'
      return
    }
    // Offline: pakai salinan tersimpan asal masih milik pengguna yang sama (data tetap dijaga RLS).
    if (check.error.status === 0 && cached?.id === uid) {
      admin.value = cached
      status.value = 'authenticated'
      return
    }
    return clear()
  }

  /** Pulihkan sesi saat aplikasi dibuka. Dipanggil sekali oleh plugin sebelum routing dimulai. */
  const boot = (): Promise<void> => {
    subscribe()
    return (booting ??= runBoot())
  }

  /** Pesan error selalu generik untuk mencegah penebakan akun (user enumeration). */
  const login = async (email: string, password: string): Promise<LoginResult> => {
    const mail = email.trim().toLowerCase()
    if (!mail || !password) return { success: false, error: 'Email dan password wajib diisi.' }

    const signedIn = await authRepository.signIn(mail, password)
    if (!signedIn.ok) {
      const { status: code, message } = signedIn.error
      if (code === 0) return { success: false, error: message }
      if (code === 429) return { success: false, error: 'Terlalu banyak percobaan. Coba lagi beberapa saat.' }
      if (code >= 500) return { success: false, error: 'Layanan sedang bermasalah. Coba lagi sebentar.' }
      return { success: false, error: 'Email atau password salah.' }
    }

    const check = await authRepository.fetchAdmin(signedIn.data.uid)
    if (!check.ok) {
      await clear()
      return { success: false, error: check.error.message }
    }
    if (!check.data) {
      await clear()
      return { success: false, error: 'Akun ini bukan admin platform. Hubungi pemilik sistem.' }
    }

    const loggedIn: PlatformAdmin = { id: check.data.id, name: check.data.name, email: mail }
    authRepository.writeCachedAdmin(loggedIn)
    expiring = false
    admin.value = loggedIn
    status.value = 'authenticated'
    return { success: true, admin: loggedIn }
  }

  const logout = async (): Promise<void> => {
    await clear()
  }

  /** Dipakai saat server menjawab 401: sesi tidak berlaku lagi. */
  const expire = (): void => {
    if (expiring) return
    expiring = true
    toast('Sesi berakhir. Silakan login ulang.', { type: 'warning' })
    void clear()
  }

  return { status, admin, boot, login, logout, expire }
}
