import { supabase } from '~/models/supabase'
import { runPage, type Result } from '~/models/result'
import type { PageResult, PaymentMethod, Sale } from '~/models/types'

const COLUMNS = 'tenant_id,no,at,cashier,method,total,paid,tenant:tenants(name,client_id)'

export interface SalesFilters {
  tenantIds: string[] | undefined
  dariIso: string
  sampaiIso: string
  metode: PaymentMethod | ''
  cari: string
  offset: number
}

export function pageSales(filters: SalesFilters, limit: number): Promise<Result<PageResult<Sale>>> {
  let query = supabase.from('sales').select(COLUMNS, { count: 'exact' }).order('at', { ascending: false })
  if (filters.tenantIds) query = query.in('tenant_id', filters.tenantIds)
  if (filters.dariIso) query = query.gte('at', filters.dariIso)
  if (filters.sampaiIso) query = query.lte('at', filters.sampaiIso)
  if (filters.metode) query = query.eq('method', filters.metode)
  if (filters.cari) query = query.or(`no.ilike.*${filters.cari}*,cashier.ilike.*${filters.cari}*`)
  return runPage<Sale>(query.range(filters.offset, filters.offset + limit - 1))
}
