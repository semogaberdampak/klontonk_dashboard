import { createLookupsApi, EMPTY_LOOKUPS, type LookupsData } from '~/lib/lookups'
import { loadLookups } from '~/models/repositories/lookupRepository'

/**
 * Daftar acuan (klien, paket, cabang) untuk dropdown dan label tabel. Dimuat sekali lalu dipakai
 * ulang semua halaman; daftarnya kecil (puluhan baris) sehingga aman disimpan di memori.
 */
export function useLookups() {
  const data = useState<LookupsData>('lookups-data', () => EMPTY_LOOKUPS)
  const ready = useState<boolean>('lookups-ready', () => false)
  const error = useState<string | null>('lookups-error', () => null)
  const { expire } = useAuth()
  const { toast } = useToast()

  const api = computed(() => createLookupsApi(data.value))

  /** Muat ulang daftar acuan setelah klien/paket/cabang berubah. */
  const refresh = async (): Promise<void> => {
    const result = await loadLookups()
    if (result.ok) {
      data.value = result.data
      error.value = null
    } else if (result.error.expired) {
      expire()
    } else {
      error.value = result.error.message
      toast(`Daftar acuan belum bisa dimuat: ${result.error.message}`, { type: 'danger', duration: 8000 })
    }
    ready.value = true
  }

  const reset = (): void => {
    data.value = EMPTY_LOOKUPS
    ready.value = false
  }

  return { api, ready, error, refresh, reset }
}
