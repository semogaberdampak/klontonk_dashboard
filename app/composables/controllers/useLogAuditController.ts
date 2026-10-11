import { downloadCsv, toCsv } from '~/lib/csv'
import { batasWaktu, tanggalJakarta } from '~/lib/dates'
import { formatDateTime, prettyDetail, type Tone } from '~/lib/format'
import { tenantIdsFor } from '~/lib/lookups'
import { bersihkanKataKunci, parseOffset } from '~/lib/query'
import { pageAuditLogs } from '~/models/repositories/auditLogRepository'
import type { AuditLog } from '~/models/types'

// Dicatat OTOMATIS oleh trigger database (db/dashboard-schema.sql), bukan oleh aplikasi.
// Sifatnya append-only -- client tidak bisa menyunting atau menghapus baris log.

export const AUDIT_LIMIT = 50
const PATH = '/log-audit'

export const AKSI_OPTIONS = [
  { value: '', label: 'Semua aksi' },
  { value: 'sale.checkout', label: 'Penjualan dicatat' },
  { value: 'return.process', label: 'Retur diproses' },
  { value: 'stock.create', label: 'Barang ditambahkan' },
  { value: 'stock.update', label: 'Stok diubah' },
  { value: 'stock.delete', label: 'Barang dihapus' },
  { value: 'price.update', label: 'Harga diubah' },
  { value: 'user.create', label: 'Akun dibuat' },
  { value: 'user.update', label: 'Akun diubah' },
  { value: 'user.delete', label: 'Akun dihapus' },
  { value: 'auth.login', label: 'Login aplikasi POS' },
  { value: 'client.create', label: 'Client dibuat' },
  { value: 'client.update', label: 'Client diubah' },
  { value: 'branch.create', label: 'Cabang dibuat' },
  { value: 'branch.update', label: 'Cabang diubah' },
  { value: 'branch.delete', label: 'Cabang dihapus' },
  { value: 'plan.create', label: 'Paket dibuat' },
  { value: 'plan.update', label: 'Paket diubah' },
  { value: 'plan.delete', label: 'Paket dihapus' },
  { value: 'subscription.create', label: 'Langganan dicatat' },
  { value: 'subscription.update', label: 'Langganan diubah' },
  { value: 'subscription.delete', label: 'Langganan dihapus' }
]

export function toneAksi(aksi: string): Tone {
  if (aksi.endsWith('.delete')) return 'bad'
  if (aksi === 'sale.checkout') return 'ok'
  if (aksi === 'return.process') return 'warn'
  if (aksi.startsWith('auth.')) return 'info'
  return ''
}

export interface AuditPageFilters {
  client: string
  tenant: string
  aksi: string
  pelaku: string
  dari: string
  sampai: string
  offset: number
}

export function parseAudit(params: URLSearchParams, now: number = Date.now()): AuditPageFilters {
  const adaTanggal = params.has('dari') || params.has('sampai')
  return {
    client: params.get('client') ?? '',
    tenant: params.get('tenant') ?? '',
    aksi: params.get('aksi') ?? '',
    pelaku: (params.get('pelaku') ?? '').trim(),
    dari: params.get('dari') || (adaTanggal ? '' : tanggalJakarta(-7, now)),
    sampai: params.get('sampai') || (adaTanggal ? '' : tanggalJakarta(0, now)),
    offset: parseOffset(params.get('offset'))
  }
}

export function useLogAuditController() {
  const go = useGo()
  const dialog = useDialog()
  const { toast } = useToast()
  const { api } = useLookups()
  const { filters, key } = useUrlFilters((params) => parseAudit(params))
  const draft = useDraft(() => {
    const f = filters.value
    return { client: f.client, tenant: f.tenant, aksi: f.aksi, pelaku: f.pelaku, dari: f.dari, sampai: f.sampai }
  })

  const state = useResource(
    () => {
      const f = filters.value
      const ids = tenantIdsFor(api.value, f.client, f.tenant)
      return pageAuditLogs(
        {
          tenantIds: ids && ids.length ? ids : undefined,
          aksi: f.aksi,
          pelaku: bersihkanKataKunci(f.pelaku),
          dariIso: batasWaktu(f.dari),
          sampaiIso: batasWaktu(f.sampai, true),
          offset: f.offset
        },
        AUDIT_LIMIT
      )
    },
    [key, api]
  )

  const apply = () => go(PATH, { ...draft, pelaku: draft.pelaku.trim() })
  const clear = () => go(PATH, { dari: '', sampai: '' })
  const goPage = (offset: number) => go(PATH, { ...filters.value, offset })
  const changeClient = (client: string) =>
    go(PATH, { client, aksi: draft.aksi, pelaku: draft.pelaku.trim(), dari: draft.dari, sampai: draft.sampai })

  function exportCsv(): void {
    const rows = state.value.status === 'ready' ? state.value.data.rows : []
    if (!rows.length) return toast('Tidak ada data untuk diunduh.', { type: 'warning' })
    const csv = toCsv(rows, [
      { label: 'waktu', key: 'at' },
      { label: 'pelaku', key: 'actor_name' },
      { label: 'peran', key: 'actor_role' },
      { label: 'aksi', key: 'action' },
      { label: 'objek', key: 'entity' },
      { label: 'objek_id', key: 'entity_id' },
      { label: 'client', key: 'client_id' },
      { label: 'cabang', key: 'tenant_id' },
      { label: 'rincian', value: (r) => prettyDetail(r.detail) }
    ])
    downloadCsv(`log-audit-${tanggalJakarta(0)}.csv`, csv)
    toast('CSV diunduh (hanya baris yang tampil).', { type: 'success' })
  }

  const detail = (baris: AuditLog) =>
    dialog.notify({
      title: `${baris.action} - ${baris.entity}`,
      message: `Waktu: ${formatDateTime(baris.at)}\nPelaku: ${baris.actor_name || '-'} (${baris.actor_role || '-'})\nObjek: ${baris.entity} ${baris.entity_id || ''}\nCabang: ${baris.tenant_id || '-'}\nClient: ${baris.client_id || '-'}\n\nRincian:\n${prettyDetail(baris.detail)}\n\nData mentah:\n${JSON.stringify(baris.detail, null, 2)}`,
      confirmText: 'Tutup'
    })

  return { filters, state, draft, apply, clear, goPage, changeClient, exportCsv, detail, api }
}
