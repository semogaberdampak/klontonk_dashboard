import { supabase } from '@/models/supabase'
import { fail, ok, run, runPage, type Result } from '@/models/result'
import type { PageResult, Tenant } from '@/models/types'

export interface TenantFilters {
  client: string
  cari: string
  offset: number
}

export function pageTenants(filters: TenantFilters, limit: number): Promise<Result<PageResult<Tenant>>> {
  let query = supabase.from('tenants').select('id,name,client_id', { count: 'exact' }).order('id')
  if (filters.client) query = query.eq('client_id', filters.client)
  if (filters.cari) query = query.ilike('name', `%${filters.cari}%`)
  return runPage<Tenant>(query.range(filters.offset, filters.offset + limit - 1))
}

/** Jumlah pengguna tiap cabang yang sedang tampil -- satu query, bukan per cabang. */
export async function countUsersByTenant(tenantIds: string[]): Promise<Record<string, number>> {
  if (!tenantIds.length) return {}
  const result = await run<{ tenant_id: string }[]>(supabase.from('profiles').select('tenant_id').in('tenant_id', tenantIds), [])
  if (!result.ok) return {}
  const peta: Record<string, number> = {}
  for (const baris of result.data) peta[baris.tenant_id] = (peta[baris.tenant_id] ?? 0) + 1
  return peta
}

/** ID cabang (T00x) dibuat otomatis oleh database. */
export async function createTenant(clientId: string, name: string): Promise<Result<Tenant>> {
  const result = await run<Tenant | null>(
    supabase.from('tenants').insert({ client_id: clientId, name }).select('id,name,client_id').single(),
    null
  )
  if (!result.ok) return fail(result.error)
  return result.data ? ok(result.data) : fail({ status: 500, code: '', message: 'Cabang tidak dikembalikan database.', expired: false })
}

export function renameTenant(id: string, name: string): Promise<Result<unknown>> {
  return run<unknown>(supabase.from('tenants').update({ name }).eq('id', id), null)
}

export function deleteTenant(id: string): Promise<Result<unknown>> {
  return run<unknown>(supabase.from('tenants').delete().eq('id', id), null)
}
