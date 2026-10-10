import { useEffect, useRef, useState, type DependencyList } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useReload } from '@/context/ReloadContext'
import { pesanError, type Result } from '@/models/result'

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

/**
 * Muat data halaman. Dimuat ulang saat `deps` berubah atau tombol "Muat ulang" ditekan.
 * Jawaban basi (navigasi lain sudah berjalan) dibuang, dan sesi berakhir (401) otomatis
 * mengembalikan pengguna ke halaman login.
 */
export function useResource<T>(loader: () => Promise<Result<T>>, deps: DependencyList): ResourceState<T> {
  const { version } = useReload()
  const { expire } = useAuth()
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' })
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    loaderRef.current().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setState({ status: 'ready', data: result.data })
        return
      }
      if (result.error.expired) expire()
      setState({ status: 'error', message: pesanError(result.error) })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, expire, ...deps])

  return state
}
