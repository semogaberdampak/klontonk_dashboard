import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createLookupsApi, EMPTY_LOOKUPS, type LookupsApi, type LookupsData } from '@/lib/lookups'
import { loadLookups } from '@/models/repositories/lookupRepository'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

// Daftar acuan dimuat sekali lalu dipakai ulang semua halaman untuk dropdown dan filter.
// Daftarnya kecil (puluhan baris) sehingga aman disimpan di memori.

interface LookupsValue {
  api: LookupsApi
  /** true setelah percobaan muat pertama selesai (berhasil atau gagal). */
  ready: boolean
  error: string | null
  /** Muat ulang daftar acuan setelah klien/paket/cabang berubah. */
  refresh: () => Promise<void>
}

const LookupsContext = createContext<LookupsValue | null>(null)

export function LookupsProvider({ children }: { children: ReactNode }) {
  const { status, expire } = useAuth()
  const toast = useToast()
  const [data, setData] = useState<LookupsData>(EMPTY_LOOKUPS)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const result = await loadLookups()
    if (result.ok) {
      setData(result.data)
      setError(null)
    } else if (result.error.expired) {
      expire()
    } else {
      setError(result.error.message)
      toast(`Daftar acuan belum bisa dimuat: ${result.error.message}`, { type: 'danger', duration: 8000 })
    }
    setReady(true)
  }, [expire, toast])

  useEffect(() => {
    if (status === 'authenticated') void refresh()
    else {
      setData(EMPTY_LOOKUPS)
      setReady(false)
    }
  }, [status, refresh])

  const api = useMemo(() => createLookupsApi(data), [data])
  const value = useMemo(() => ({ api, ready, error, refresh }), [api, ready, error, refresh])

  return <LookupsContext.Provider value={value}>{children}</LookupsContext.Provider>
}

export function useLookups(): LookupsValue {
  const value = useContext(LookupsContext)
  if (!value) throw new Error('useLookups harus dipakai di dalam <LookupsProvider>.')
  return value
}
