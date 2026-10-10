import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/models/supabase'
import * as authRepository from '@/models/repositories/authRepository'
import type { PlatformAdmin } from '@/models/types'
import { useToast } from './ToastContext'

// Login dashboard memakai EMAIL + PASSWORD -- berbeda dari klontonk_pos yang memakai username
// (username dipetakan ke <username>@klontonk.local). Pemisahan ini disengaja: akun platform
// tidak bisa dipakai login ke aplikasi POS client, dan sebaliknya.

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

export type LoginResult = { success: true; admin: PlatformAdmin } | { success: false; error: string }

export interface AuthValue {
  status: AuthStatus
  admin: PlatformAdmin | null
  /** Pesan error selalu generik untuk mencegah penebakan akun (user enumeration). */
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  /** Dipakai saat server menjawab 401: sesi tidak berlaku lagi. */
  expire: () => void
}

export const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null)
  const expiring = useRef(false)

  const clear = useCallback(async () => {
    authRepository.writeCachedAdmin(null)
    setAdmin(null)
    setStatus('anonymous')
    await authRepository.signOut()
  }, [])

  // Pulihkan sesi saat aplikasi dibuka. Menunggu ini penting: tanpa menunggu, status login
  // dibaca terlalu dini dan admin selalu dilempar ke halaman login.
  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      const cached = authRepository.readCachedAdmin()
      const uid = await authRepository.currentUserId()
      if (cancelled) return
      if (!uid) return clear()

      const check = await authRepository.fetchAdmin(uid)
      if (cancelled) return
      if (check.ok) {
        if (!check.data) return clear() // bukan admin platform
        const restored: PlatformAdmin = {
          id: check.data.id,
          name: check.data.name,
          email: cached?.id === uid ? cached.email : null
        }
        authRepository.writeCachedAdmin(restored)
        setAdmin(restored)
        setStatus('authenticated')
        return
      }
      // Offline: pakai salinan tersimpan asal masih milik pengguna yang sama (data tetap
      // dijaga RLS, jadi ini tidak membuka akses apa pun).
      if (check.error.status === 0 && cached?.id === uid) {
        setAdmin(cached)
        setStatus('authenticated')
        return
      }
      return clear()
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [clear])

  // Sesi dibuang supabase-js (refresh token ditolak, logout di tab lain) -> kembali ke login.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_OUT') return
      authRepository.writeCachedAdmin(null)
      setAdmin(null)
      setStatus('anonymous')
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const login = useCallback<AuthValue['login']>(
    async (email, password) => {
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
      expiring.current = false
      setAdmin(loggedIn)
      setStatus('authenticated')
      return { success: true, admin: loggedIn } as const
    },
    [clear]
  )

  const logout = useCallback(async () => {
    await clear()
  }, [clear])

  const expire = useCallback(() => {
    if (expiring.current) return
    expiring.current = true
    toast('Sesi berakhir. Silakan login ulang.', { type: 'warning' })
    void clear()
  }, [clear, toast])

  const value = useMemo<AuthValue>(
    () => ({ status, admin, login, logout, expire }),
    [status, admin, login, logout, expire]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth harus dipakai di dalam <AuthProvider>.')
  return value
}
