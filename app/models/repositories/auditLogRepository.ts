import { supabase } from '~/models/supabase'
import { run, runPage, type Result } from '~/models/result'
import type { AuditLog, PageResult } from '~/models/types'

const COLUMNS = 'at,actor_name,actor_role,action,entity,entity_id,client_id,tenant_id,detail'

export interface AuditFilters {
  tenantIds: string[] | undefined
  aksi: string
  pelaku: string
  /** Batas waktu ISO (hasil batasWaktu), string kosong = tanpa batas. */
  dariIso: string
  sampaiIso: string
  offset: number
}

export function pageAuditLogs(filters: AuditFilters, limit: number): Promise<Result<PageResult<AuditLog>>> {
  let query = supabase.from('audit_logs').select(COLUMNS, { count: 'exact' }).order('at', { ascending: false })
  if (filters.tenantIds) query = query.in('tenant_id', filters.tenantIds)
  if (filters.aksi) query = query.eq('action', filters.aksi)
  if (filters.pelaku) query = query.ilike('actor_name', `%${filters.pelaku}%`)
  if (filters.dariIso) query = query.gte('at', filters.dariIso)
  if (filters.sampaiIso) query = query.lte('at', filters.sampaiIso)
  return runPage<AuditLog>(query.range(filters.offset, filters.offset + limit - 1))
}

export function recentAuditLogs(limit: number): Promise<Result<AuditLog[]>> {
  return run<AuditLog[]>(supabase.from('audit_logs').select(COLUMNS).order('at', { ascending: false }).limit(limit), [])
}
