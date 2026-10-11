import { downloadCsv, toCsv } from '~/lib/csv'
import { tanggalJakarta } from '~/lib/dates'
import { toNumber } from '~/lib/format'
import { listOverview } from '~/models/repositories/overviewRepository'
import { dailyUsage } from '~/models/repositories/usageRepository'
import { ok } from '~/models/result'
import type { ClientOverview, UsageDay } from '~/models/types'

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
  const { toast } = useToast()
  const { filters, key } = useUrlFilters((params) => parsePemakaian(params))
  const draft = useDraft(() => ({ ...filters.value }))

  const state = useResource(async () => {
    const f = filters.value
    const [overview, harian] = await Promise.all([
      listOverview(),
      f.client ? dailyUsage(f.client, f.dari, f.sampai) : Promise.resolve(ok<UsageDay[]>([]))
    ])
    if (!overview.ok) return overview
    if (!harian.ok) return harian
    return ok<PemakaianData>({
      daftar: overview.data,
      klien: overview.data.find((c) => c.id === f.client) ?? null,
      harian: harian.data
    })
  }, [key])

  const apply = () => go(PATH, { ...draft })
  const changeClient = (client: string) => go(PATH, { client, dari: draft.dari, sampai: draft.sampai })
  const pilih = (client: string) => go(PATH, { client, dari: filters.value.dari, sampai: filters.value.sampai })
  const lastDays = (hari: number) => go(PATH, { client: filters.value.client, dari: tanggalJakarta(-(hari - 1)), sampai: tanggalJakarta(0) })

  function exportCsv(): void {
    const harian = state.value.status === 'ready' ? state.value.data.harian : []
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
    const f = filters.value
    downloadCsv(`pemakaian-${f.client}-${f.dari}-${f.sampai}.csv`, csv)
    toast('CSV diunduh.', { type: 'success' })
  }

  return { filters, state, draft, apply, changeClient, pilih, lastDays, exportCsv }
}
