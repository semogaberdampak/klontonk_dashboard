import { supabase } from '@/models/supabase'
import { run, runCount, runPage, type Result } from '@/models/result'
import type { ClientEvent, EventLevel, PageResult } from '@/models/types'

const COLUMNS = 'at,level,source,message,context,app_version,device,client_id,tenant_id'

export interface EventFilters {
  level: EventLevel | ''
  tenantIds: string[] | undefined
  /** Dipakai bila client dipilih tanpa cabang spesifik. */
  clientId: string
  cari: string
  dariIso: string
  sampaiIso: string
  offset: number
}

export function pageEvents(filters: EventFilters, limit: number): Promise<Result<PageResult<ClientEvent>>> {
  let query = supabase.from('client_events').select(COLUMNS, { count: 'exact' }).order('at', { ascending: false })
  if (filters.level) query = query.eq('level', filters.level)
  if (filters.tenantIds) query = query.in('tenant_id', filters.tenantIds)
  if (filters.clientId) query = query.eq('client_id', filters.clientId)
  if (filters.dariIso) query = query.gte('at', filters.dariIso)
  if (filters.sampaiIso) query = query.lte('at', filters.sampaiIso)
  if (filters.cari) query = query.ilike('message', `%${filters.cari}%`)
  return runPage<ClientEvent>(query.range(filters.offset, filters.offset + limit - 1))
}

/** Hitung baris per level (ikut filter client dan batas akhir, bukan filter lain). */
export function countEvents(level: EventLevel, clientId: string, sampaiIso: string): Promise<number | null> {
  let query = supabase.from('client_events').select('id', { count: 'exact', head: true }).eq('level', level)
  if (clientId) query = query.eq('client_id', clientId)
  if (sampaiIso) query = query.lte('at', sampaiIso)
  return runCount(query)
}

export function recentErrors(limit: number): Promise<Result<ClientEvent[]>> {
  return run<ClientEvent[]>(
    supabase
      .from('client_events')
      .select('at,level,source,message,tenant_id,client_id,app_version')
      .eq('level', 'error')
      .order('at', { ascending: false })
      .limit(limit),
    []
  )
}
