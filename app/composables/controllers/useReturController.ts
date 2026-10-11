import { downloadCsv, toCsv } from '~/lib/csv'
import { batasWaktu, tanggalJakarta } from '~/lib/dates'
import { tenantIdsFor } from '~/lib/lookups'
import { bersihkanKataKunci, parseOffset } from '~/lib/query'
import { pageReturns } from '~/models/repositories/returnRepository'
import type { ReturnKind, ReturnReason } from '~/models/types'

// kind = 'pelanggan' (barang kembali ke stok, ada uang kembali) atau 'supplier' (barang
// rusak/kedaluwarsa keluar dari stok, tanpa uang). Seperti transaksi, data hanya bisa dibaca.

export const RETUR_LIMIT = 50
const PATH = '/retur'
const KINDS: readonly ReturnKind[] = ['pelanggan', 'supplier']
const REASONS: readonly ReturnReason[] = ['rusak', 'kedaluwarsa', 'salah_barang', 'tidak_sesuai', 'lainnya']

export const JENIS_OPTIONS = [
  { value: '', label: 'Semua jenis' },
  { value: 'pelanggan', label: 'Dari pelanggan (stok masuk)' },
  { value: 'supplier', label: 'Ke supplier (stok keluar)' }
]

export const ALASAN_OPTIONS = [
  { value: '', label: 'Semua alasan' },
  { value: 'rusak', label: 'Rusak' },
  { value: 'kedaluwarsa', label: 'Kedaluwarsa' },
  { value: 'salah_barang', label: 'Salah barang' },
  { value: 'tidak_sesuai', label: 'Tidak sesuai' },
  { value: 'lainnya', label: 'Lainnya' }
]

export const LABEL_ALASAN: Record<string, string> = {
  rusak: 'Rusak', kedaluwarsa: 'Kedaluwarsa', salah_barang: 'Salah barang', tidak_sesuai: 'Tidak sesuai', lainnya: 'Lainnya'
}

export interface ReturFilters {
  client: string
  tenant: string
  dari: string
  sampai: string
  jenis: ReturnKind | ''
  alasan: ReturnReason | ''
  cari: string
  offset: number
}

export function parseRetur(params: URLSearchParams, now: number = Date.now()): ReturFilters {
  const adaTanggal = params.has('dari') || params.has('sampai')
  return {
    client: params.get('client') ?? '',
    tenant: params.get('tenant') ?? '',
    dari: params.get('dari') || (adaTanggal ? '' : tanggalJakarta(-30, now)),
    sampai: params.get('sampai') || (adaTanggal ? '' : tanggalJakarta(0, now)),
    jenis: oneOf(params.get('jenis'), KINDS),
    alasan: oneOf(params.get('alasan'), REASONS),
    cari: (params.get('cari') ?? '').trim(),
    offset: parseOffset(params.get('offset'))
  }
}

export function useReturController() {
  const go = useGo()
  const { toast } = useToast()
  const { api } = useLookups()
  const { filters, key } = useUrlFilters((params) => parseRetur(params))
  const draft = useDraft(() => {
    const f = filters.value
    return { client: f.client, tenant: f.tenant, dari: f.dari, sampai: f.sampai, jenis: f.jenis as string, alasan: f.alasan as string, cari: f.cari }
  })

  const state = useResource(
    () => {
      const f = filters.value
      return pageReturns(
        {
          tenantIds: tenantIdsFor(api.value, f.client, f.tenant),
          dariIso: batasWaktu(f.dari),
          sampaiIso: batasWaktu(f.sampai, true),
          jenis: f.jenis,
          alasan: f.alasan,
          cari: bersihkanKataKunci(f.cari),
          offset: f.offset
        },
        RETUR_LIMIT
      )
    },
    [key, api]
  )

  const apply = () => go(PATH, { ...draft, cari: draft.cari.trim() })
  const clear = () => go(PATH, { dari: '', sampai: '' })
  const goPage = (offset: number) => go(PATH, { ...filters.value, offset })
  const changeClient = (client: string) =>
    go(PATH, { client, dari: draft.dari, sampai: draft.sampai, jenis: draft.jenis, alasan: draft.alasan, cari: draft.cari.trim() })

  function exportCsv(): void {
    const rows = state.value.status === 'ready' ? state.value.data.rows : []
    if (!rows.length) return toast('Tidak ada data untuk diunduh.', { type: 'warning' })
    const csv = toCsv(rows, [
      { label: 'waktu', key: 'at' },
      { label: 'no', key: 'no' },
      { label: 'cabang_id', key: 'tenant_id' },
      { label: 'cabang', value: (r) => r.tenant?.name ?? '' },
      { label: 'client', value: (r) => (r.tenant ? api.value.clientName(r.tenant.client_id) : '') },
      { label: 'jenis', key: 'kind' },
      { label: 'barang', key: 'name' },
      { label: 'jumlah', key: 'qty' },
      { label: 'satuan', key: 'unit' },
      { label: 'nilai', key: 'amount' },
      { label: 'alasan', key: 'reason' },
      { label: 'kasir', key: 'cashier' },
      { label: 'catatan', key: 'note' }
    ])
    downloadCsv(`retur-${tanggalJakarta(0)}.csv`, csv)
    toast('CSV diunduh (hanya baris yang tampil).', { type: 'success' })
  }

  return { filters, state, draft, apply, clear, goPage, changeClient, exportCsv, api }
}
