import { useEffect, useState } from 'react'

/**
 * Salinan kerja dari filter di URL untuk isian formulir. Dipulihkan setiap kali filter di URL
 * berubah (mis. tombol "Bersihkan" atau pindah halaman), sedangkan ketikan pengguna tidak
 * mengubah URL sebelum tombol "Terapkan" ditekan.
 */
export function useDraft<T extends object>(source: T): [T, <K extends keyof T>(key: K, value: T[K]) => void] {
  const signature = JSON.stringify(source)
  const [draft, setDraft] = useState<T>(source)

  useEffect(() => {
    setDraft(source)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const setField = <K extends keyof T>(key: K, value: T[K]) => setDraft((current) => ({ ...current, [key]: value }))
  return [draft, setField]
}
