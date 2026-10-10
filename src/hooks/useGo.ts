import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export type Go = (path: string, params?: Record<string, string | number | undefined>) => void

/**
 * Pindah halaman dengan parameter URL. Parameter bernilai kosong SENGAJA dipertahankan:
 * halaman berfilter tanggal membedakan "tidak ada ?dari=" (pakai tanggal bawaan) dari
 * "?dari=" kosong (tanpa batas tanggal).
 */
export function useGo(): Go {
  const navigate = useNavigate()
  return useCallback<Go>(
    (path, params) => {
      const query = new URLSearchParams()
      for (const [kunci, nilai] of Object.entries(params ?? {})) {
        if (nilai !== undefined) query.set(kunci, String(nilai))
      }
      const search = query.toString()
      navigate({ pathname: path, search: search ? `?${search}` : '' })
    },
    [navigate]
  )
}
