import { useDraft } from '@/hooks/useDraft'
import { useGo } from '@/hooks/useGo'
import { useResource } from '@/hooks/useResource'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { useToast } from '@/context/ToastContext'
import { downloadCsv, toCsv } from '@/lib/csv'
import { tanggalJakarta } from '@/lib/dates'
import { toNumber } from '@/lib/format'
import { listOverview } from '@/models/repositories/overviewRepository'
import { dailyUsage } from '@/models/repositories/usageRepository'
import { ok } from '@/models/result'
import type { ClientOverview, UsageDay } from '@/models/types'

// Aktivitas harian satu client. Angkanya dihitung DATABASE lewat RPC usage_daily() (bukan di
// browser), sehingga tetap ringan walau data sudah menumpuk bertahun-tahun.

const PATH = '/pemakaian'

export interface PemakaianFilters {
  client: string
  dari: string
  sampai: string
}

export function parsePemakaian(params: URLSearchParams, now: number = Date.now()): PemakaianFilters {
  return {
    client: params.get('client') ?? '',
    dari: params.get('dari') || tanggalJakarta(-29, now),
    sampai: params.get('sampai') || tanggalJakarta(0, now)
  }
}

export interface UsageTotals {
  trx: number
  omzet: number
  retur: number
  nilaiRetur: number
  log: number
  error: number
}

export function totalUsage(harian: readonly UsageDay[]): UsageTotals {
  return harian.reduce<UsageTotals>(
    (t, r) => ({
      trx: t.trx + toNumber(r.trx_count),
      omzet: t.omzet + toNumber(r.trx_total),
      retur: t.retur + toNumber(r.return_count),
      nilaiRetur: t.nilaiRetur + toNumber(r.return_amount),
      log: t.log + toNumber(r.log_count),
      error: t.error + toNumber(r.event_count)
    }),
    { trx: 0, omzet: 0, retur: 0, nilaiRetur: 0, log: 0, error: 0 }
  )
}

export interface PemakaianData {
  daftar: ClientOverview[]
  klien: ClientOverview | null
  harian: UsageDay[]
}

export function usePemakaianController() {
  const go = useGo()
  const toast = useToast()
  const { filters, key } = useUrlFilters(parsePemakaian)
  const [draft, setField] = useDraft({ ...filters })

  const state = useResource(async () => {
    const [overview, harian] = await Promise.all([
      listOverview(),
      filters.client ? dailyUsage(filters.client, filters.dari, filters.sampai) : Promise.resolve(ok<UsageDay[]>([]))
    ])
    if (!overview.ok) return overview
    if (!harian.ok) return harian
    return ok<PemakaianData>({
      daftar: overview.data,
      klien: overview.data.find((c) => c.id === filters.client) ?? null,
      harian: harian.data
    })
  }, [key])

  const apply = () => go(PATH, { ...draft })
  const changeClient = (client: string) => go(PATH, { client, dari: draft.dari, sampai: draft.sampai })
  const pilih = (client: string) => go(PATH, { client, dari: filters.dari, sampai: filters.sampai })
  const lastDays = (hari: number) => go(PATH, { client: filters.client, dari: tanggalJakarta(-(hari - 1)), sampai: tanggalJakarta(0) })

  const exportCsv = () => {
    const harian = state.status === 'ready' ? state.data.harian : []
    if (!harian.length) return toast('Tidak ada data untuk diunduh.', { type: 'warning' })
    const csv = toCsv(harian, [
      { label: 'tanggal', key: 'day' },
      { label: 'transaksi', key: 'trx_count' },
      { label: 'omzet', key: 'trx_total' },
      { label: 'retur', key: 'return_count' },
      { label: 'nilai_retur', key: 'return_amount' },
      { label: 'log_audit', key: 'log_count' },
      { label: 'error', key: 'event_count' }
    ])
    downloadCsv(`pemakaian-${filters.client}-${filters.dari}-${filters.sampai}.csv`, csv)
    toast('CSV diunduh.', { type: 'success' })
  }

  return { filters, state, draft, setField, apply, changeClient, pilih, lastDays, exportCsv }
}
