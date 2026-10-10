import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface ReloadValue {
  /** Naik setiap kali halaman perlu memuat ulang datanya. */
  version: number
  reload: () => void
}

const ReloadContext = createContext<ReloadValue | null>(null)

/** Pemicu muat-ulang tunggal: tombol "Muat ulang" dan setiap simpan/hapus memakainya. */
export function ReloadProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const value = useMemo(() => ({ version, reload }), [version, reload])
  return <ReloadContext.Provider value={value}>{children}</ReloadContext.Provider>
}

export function useReload(): ReloadValue {
  const value = useContext(ReloadContext)
  if (!value) throw new Error('useReload harus dipakai di dalam <ReloadProvider>.')
  return value
}
