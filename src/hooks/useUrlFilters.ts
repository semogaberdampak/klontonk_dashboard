import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Filter halaman disimpan di URL (bisa dibagikan/di-bookmark). `key` berubah setiap kali
 * parameter berubah, dipakai sebagai dependensi pemuatan data.
 */
export function useUrlFilters<F>(parse: (params: URLSearchParams) => F): { filters: F; key: string } {
  const [params] = useSearchParams()
  const key = params.toString()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filters = useMemo(() => parse(new URLSearchParams(key)), [key])
  return { filters, key }
}

/** Ambil nilai parameter hanya bila termasuk daftar yang diizinkan; selain itu kosong. */
export function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | '' {
  return allowed.find((item) => item === value) ?? ''
}
