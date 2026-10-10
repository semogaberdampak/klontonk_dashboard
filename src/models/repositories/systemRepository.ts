import { supabase } from '@/models/supabase'
import { run, runCount, type Result } from '@/models/result'
import type { PurgeSummary, SystemCounts } from '@/models/types'

const countOf = (table: string) => runCount(supabase.from(table).select('id', { count: 'exact', head: true }))

export async function systemCounts(): Promise<SystemCounts> {
  const [klien, cabang, pengguna, logAudit, logTeknis] = await Promise.all([
    countOf('clients'),
    countOf('tenants'),
    countOf('profiles'),
    countOf('audit_logs'),
    countOf('client_events')
  ])
  return { klien, cabang, pengguna, logAudit, logTeknis }
}

export function purgeOldLogs(auditDays: number, eventDays: number): Promise<Result<PurgeSummary>> {
  return run<PurgeSummary>(
    supabase.rpc('purge_old_logs', { p_audit_days: auditDays, p_event_days: eventDays }),
    { audit_deleted: 0, events_deleted: 0 }
  )
}
