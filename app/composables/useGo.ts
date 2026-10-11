export type Go = (path: string, params?: Record<string, string | number | undefined>) => void

/**
 * Pindah halaman dengan parameter URL. Parameter bernilai kosong SENGAJA dipertahankan:
 * halaman berfilter tanggal membedakan "tidak ada ?dari=" (pakai tanggal bawaan) dari
 * "?dari=" kosong (tanpa batas tanggal).
 */
export function useGo(): Go {
  return (path, params) => {
    const query: Record<string, string> = {}
    for (const [name, value] of Object.entries(params ?? {})) {
      if (value !== undefined) query[name] = String(value)
    }
    void navigateTo({ path, query })
  }
}
