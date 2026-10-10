import { useDraft } from '@/hooks/useDraft'
import { useGo } from '@/hooks/useGo'
import { useResource } from '@/hooks/useResource'
import { oneOf, useUrlFilters } from '@/hooks/useUrlFilters'
import { useDialog } from '@/context/DialogContext'
import { useLookups } from '@/context/LookupsContext'
import { useToast } from '@/context/ToastContext'
import { downloadCsv, toCsv } from '@/lib/csv'
import { batasWaktu, tanggalJakarta } from '@/lib/dates'
import { formatDateTime, type Tone } from '@/lib/format'
import { tenantIdsFor } from '@/lib/lookups'
import { bersihkanKataKunci, parseOffset } from '@/lib/query'
import { countEvents, pageEvents } from '@/models/repositories/eventRepository'
import { ok } from '@/models/result'
import type { ClientEvent, EventLevel } from '@/models/types'

// Error/peringatan yang dikirim dari perangkat client (tabel client_events). Aplikasi POS belum
// mengirim log ini otomatis (lihat README, bagian Integrasi POS).

export const TEKNIS_LIMIT = 50
const PATH = '/log-teknis'
const LEVELS: readonly EventLevel[] = ['error', 'warn', 'info']

export const LEVEL_OPTIONS = [
  { value: '', label: 'Semua level' },
  { value: 'error', label: 'Error' },
  { value: 'warn', label: 'Peringatan' },
  { value: 'info', label: 'Info' }
]

export const levelTone = (level: EventLevel): Tone => ({ error: 'bad', warn: 'warn', info: 'info' } as const)[level] ?? ''

export interface TeknisFilters {
  level: EventLevel | ''
  client: string
  tenant: string
  cari: string
  dari: string
  sampai: string
  offset: number
}

export function parseTeknis(params: URLSearchParams, now: number = Date.now()): TeknisFilters {
  const adaTanggal = params.has('dari') || params.has('sampai')
  return {
    level: oneOf(params.get('level'), LEVELS),
    client: params.get('client') ?? '',
    tenant: params.get('tenant') ?? '',
    cari: (params.get('cari') ?? '').trim(),
    dari: params.get('dari') || (adaTanggal ? '' : tanggalJakarta(-7, now)),
    sampai: params.get('sampai') || (adaTanggal ? '' : tanggalJakarta(0, now)),
    offset: parseOffset(params.get('offset'))
  }
}

export interface LevelCounts {
  error: number
  warn: number
  info: number
}

export function useLogTeknisController() {
  const go = useGo()
  const dialog = useDialog()
  const toast = useToast()
  const { api } = useLookups()
  const { filters, key } = useUrlFilters(parseTeknis)
  const [draft, setField] = useDraft({
    level: filters.level as string, client: filters.client, tenant: filters.tenant, cari: filters.cari, dari: filters.dari, sampai: filters.sampai
  })

  const state = useResource(async () => {
    const ids = tenantIdsFor(api, filters.client, filters.tenant)
    const clientId = filters.client && !filters.tenant ? filters.client : ''
    const sampaiIso = batasWaktu(filters.sampai, true)

    const [halaman, error, warn, info] = await Promise.all([
      pageEvents(
        {
          level: filters.level,
          tenantIds: ids && ids.length ? ids : undefined,
          clientId,
          cari: bersihkanKataKunci(filters.cari),
          dariIso: batasWaktu(filters.dari),
          sampaiIso,
          offset: filters.offset
        },
        TEKNIS_LIMIT
      ),
      countEvents('error', clientId, sampaiIso),
      countEvents('warn', clientId, sampaiIso),
      countEvents('info', clientId, sampaiIso)
    ])
    if (!halaman.ok) return halaman
    const hitung: LevelCounts = { error: error ?? 0, warn: warn ?? 0, info: info ?? 0 }
    return ok({ ...halaman.data, hitung })
  }, [key, api])

  const apply = () => go(PATH, { ...draft, cari: draft.cari.trim() })
  const clear = () => go(PATH, { dari: '', sampai: '' })
  const goPage = (offset: number) => go(PATH, { ...filters, offset })
  const changeClient = (client: string) =>
    go(PATH, { level: draft.level, client, cari: draft.cari.trim(), dari: draft.dari, sampai: draft.sampai })

  const exportCsv = () => {
    const rows = state.status === 'ready' ? state.data.rows : []
    if (!rows.length) return toast('Tidak ada data untuk diunduh.', { type: 'warning' })
    const csv = toCsv(rows, [
      { label: 'waktu', key: 'at' },
      { label: 'level', key: 'level' },
      { label: 'sumber', key: 'source' },
      { label: 'pesan', key: 'message' },
      { label: 'client', key: 'client_id' },
      { label: 'cabang', key: 'tenant_id' },
      { label: 'versi', key: 'app_version' },
      { label: 'perangkat', key: 'device' }
    ])
    downloadCsv(`log-teknis-${tanggalJakarta(0)}.csv`, csv)
    toast('CSV diunduh (hanya baris yang tampil).', { type: 'success' })
  }

  const detail = (baris: ClientEvent) =>
    dialog.notify({
      title: `${baris.level.toUpperCase()} - ${baris.source}`,
      message: `Waktu: ${formatDateTime(baris.at)}\nClient: ${baris.client_id || '-'}\nCabang: ${baris.tenant_id || '-'}\nVersi aplikasi: ${baris.app_version || '-'}\nPerangkat: ${baris.device || '-'}\n\nPesan:\n${baris.message}\n\nKonteks:\n${JSON.stringify(baris.context, null, 2)}`,
      confirmText: 'Tutup'
    })

  return { filters, state, draft, setField, apply, clear, goPage, changeClient, exportCsv, detail, api }
}
