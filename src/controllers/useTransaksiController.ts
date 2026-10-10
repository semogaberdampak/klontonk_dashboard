import { useDraft } from '@/hooks/useDraft'
import { useGo } from '@/hooks/useGo'
import { useResource } from '@/hooks/useResource'
import { oneOf, useUrlFilters } from '@/hooks/useUrlFilters'
import { useLookups } from '@/context/LookupsContext'
import { useToast } from '@/context/ToastContext'
import { downloadCsv, toCsv } from '@/lib/csv'
import { batasWaktu, tanggalJakarta } from '@/lib/dates'
import { tenantIdsFor } from '@/lib/lookups'
import { bersihkanKataKunci, parseOffset } from '@/lib/query'
import { pageSales } from '@/models/repositories/salesRepository'
import type { PaymentMethod } from '@/models/types'

// Data TIDAK bisa diubah dari dashboard -- disengaja: satu-satunya cara sah menambah
// penjualan adalah lewat kasir di POS (fungsi checkout()), supaya stok dan struk konsisten.

export const TRANSAKSI_LIMIT = 50
const PATH = '/transaksi'
const METHODS: readonly PaymentMethod[] = ['tunai', 'nontunai']

export const METODE_OPTIONS = [
  { value: '', label: 'Semua metode' },
  { value: 'tunai', label: 'Tunai' },
  { value: 'nontunai', label: 'Non-tunai' }
]

export interface TransaksiFilters {
  client: string
  tenant: string
  dari: string
  sampai: string
  metode: PaymentMethod | ''
  cari: string
  offset: number
}

export function parseTransaksi(params: URLSearchParams, now: number = Date.now()): TransaksiFilters {
  const adaTanggal = params.has('dari') || params.has('sampai')
  return {
    client: params.get('client') ?? '',
    tenant: params.get('tenant') ?? '',
    dari: params.get('dari') || (adaTanggal ? '' : tanggalJakarta(-30, now)),
    sampai: params.get('sampai') || (adaTanggal ? '' : tanggalJakarta(0, now)),
    metode: oneOf(params.get('metode'), METHODS),
    cari: (params.get('cari') ?? '').trim(),
    offset: parseOffset(params.get('offset'))
  }
}

export function useTransaksiController() {
  const go = useGo()
  const toast = useToast()
  const { api } = useLookups()
  const { filters, key } = useUrlFilters(parseTransaksi)
  const [draft, setField] = useDraft({
    client: filters.client, tenant: filters.tenant, dari: filters.dari, sampai: filters.sampai, metode: filters.metode as string, cari: filters.cari
  })

  const state = useResource(
    () =>
      pageSales(
        {
          tenantIds: tenantIdsFor(api, filters.client, filters.tenant),
          dariIso: batasWaktu(filters.dari),
          sampaiIso: batasWaktu(filters.sampai, true),
          metode: filters.metode,
          cari: bersihkanKataKunci(filters.cari),
          offset: filters.offset
        },
        TRANSAKSI_LIMIT
      ),
    [key, api]
  )

  const apply = () => go(PATH, { ...draft, cari: draft.cari.trim() })
  const clear = () => go(PATH, { dari: '', sampai: '' })
  const goPage = (offset: number) => go(PATH, { ...filters, offset })
  const changeClient = (client: string) =>
    go(PATH, { client, dari: draft.dari, sampai: draft.sampai, metode: draft.metode, cari: draft.cari.trim() })

  const exportCsv = () => {
    const rows = state.status === 'ready' ? state.data.rows : []
    if (!rows.length) return toast('Tidak ada data untuk diunduh.', { type: 'warning' })
    const csv = toCsv(rows, [
      { label: 'waktu', key: 'at' },
      { label: 'no', key: 'no' },
      { label: 'cabang_id', key: 'tenant_id' },
      { label: 'cabang', value: (r) => r.tenant?.name ?? '' },
      { label: 'client', value: (r) => (r.tenant ? api.clientName(r.tenant.client_id) : '') },
      { label: 'kasir', key: 'cashier' },
      { label: 'metode', key: 'method' },
      { label: 'total', key: 'total' },
      { label: 'dibayar', key: 'paid' }
    ])
    downloadCsv(`transaksi-${tanggalJakarta(0)}.csv`, csv)
    toast('CSV diunduh (hanya baris yang tampil).', { type: 'success' })
  }

  return { filters, state, draft, setField, apply, clear, goPage, changeClient, exportCsv, api }
}
