import { formatNumber, toNumber } from '~/lib/format'
import { listOverview } from '~/models/repositories/overviewRepository'
import { recentAuditLogs } from '~/models/repositories/auditLogRepository'
import { recentErrors } from '~/models/repositories/eventRepository'
import { ok } from '~/models/result'
import type { AuditLog, ClientEvent, ClientOverview } from '~/models/types'

// Satu layar untuk melihat kondisi seluruh client: langganan yang mendekati akhir,
// error terbaru dari perangkat client, dan aktivitas terakhir.

export const AMBANG_HARI = 14 // langganan dianggap "segera berakhir" bila <= 14 hari

const hasNoDays = (c: ClientOverview): boolean => c.days_left === null || c.days_left === undefined

export function needsAttention(c: ClientOverview): boolean {
  return (
    c.status !== 'aktif' ||
    c.sub_status === 'berhenti' ||
    hasNoDays(c) ||
    Number(c.days_left) <= AMBANG_HARI ||
    toNumber(c.errors_7d) > 0
  )
}

export function alasanPerhatian(c: ClientOverview): string {
  const bagian: string[] = []
  if (c.status === 'suspend') bagian.push('client disuspend')
  if (c.status === 'berhenti') bagian.push('client berhenti')
  if (c.sub_status === 'berhenti') bagian.push('langganan berhenti')
  if (hasNoDays(c)) bagian.push('belum ada langganan')
  else if (Number(c.days_left) < 0) bagian.push('langganan sudah berakhir')
  else if (Number(c.days_left) <= AMBANG_HARI) bagian.push('langganan segera berakhir')
  if (toNumber(c.errors_7d) > 0) bagian.push(`${formatNumber(c.errors_7d)} error dalam 7 hari`)
  return bagian.join(', ') || '-'
}

export const sumOf = (rows: readonly ClientOverview[], key: keyof ClientOverview): number =>
  rows.reduce((total, row) => total + toNumber(row[key] as ClientOverview['trx_30d']), 0)

export interface RingkasanData {
  klien: ClientOverview[]
  /** null = log belum bisa dibaca (tidak menggagalkan halaman). */
  aktivitas: AuditLog[] | null
  errors: ClientEvent[] | null
}

export function useRingkasanController() {
  const go = useGo()
  const state = useResource(async () => {
    const [overview, log, errors] = await Promise.all([listOverview(), recentAuditLogs(8), recentErrors(5)])
    if (!overview.ok) return overview
    return ok<RingkasanData>({
      klien: overview.data,
      aktivitas: log.ok ? log.data : null,
      errors: errors.ok ? errors.data : null
    })
  })

  return { state, go }
}
