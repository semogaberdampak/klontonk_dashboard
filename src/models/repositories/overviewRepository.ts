import { supabase } from '@/models/supabase'
import { run, runPage, type Result } from '@/models/result'
import type { ClientOverview, ClientStatus, PageResult } from '@/models/types'

const VIEW = 'v_client_overview'

/** Semua client dengan angka agregat (dihitung database, bukan di browser). */
export function listOverview(): Promise<Result<ClientOverview[]>> {
  return run<ClientOverview[]>(supabase.from(VIEW).select('*').order('name'), [])
}

export function listPlanUsage(): Promise<Result<Pick<ClientOverview, 'id' | 'plan_code'>[]>> {
  return run(supabase.from(VIEW).select('id,plan_code'), [])
}

export interface ClientFilters {
  cari: string
  status: ClientStatus | ''
  offset: number
}

export function pageOverview(filters: ClientFilters, limit: number): Promise<Result<PageResult<ClientOverview>>> {
  let query = supabase.from(VIEW).select('*', { count: 'exact' }).order('name')
  if (filters.cari) query = query.ilike('name', `%${filters.cari}%`)
  if (filters.status) query = query.eq('status', filters.status)
  return runPage<ClientOverview>(query.range(filters.offset, filters.offset + limit - 1))
}
