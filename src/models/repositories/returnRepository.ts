import { supabase } from '@/models/supabase'
import { runPage, type Result } from '@/models/result'
import type { PageResult, ReturnKind, ReturnReason, StockReturn } from '@/models/types'

const COLUMNS = 'tenant_id,no,at,cashier,kind,item_id,name,unit,qty,amount,reason,note,tenant:tenants(name,client_id)'

export interface ReturnFilters {
  tenantIds: string[] | undefined
  dariIso: string
  sampaiIso: string
  jenis: ReturnKind | ''
  alasan: ReturnReason | ''
  cari: string
  offset: number
}

export function pageReturns(filters: ReturnFilters, limit: number): Promise<Result<PageResult<StockReturn>>> {
  let query = supabase.from('stock_returns').select(COLUMNS, { count: 'exact' }).order('at', { ascending: false })
  if (filters.tenantIds) query = query.in('tenant_id', filters.tenantIds)
  if (filters.dariIso) query = query.gte('at', filters.dariIso)
  if (filters.sampaiIso) query = query.lte('at', filters.sampaiIso)
  if (filters.jenis) query = query.eq('kind', filters.jenis)
  if (filters.alasan) query = query.eq('reason', filters.alasan)
  if (filters.cari) {
    query = query.or(`no.ilike.*${filters.cari}*,name.ilike.*${filters.cari}*,cashier.ilike.*${filters.cari}*`)
  }
  return runPage<StockReturn>(query.range(filters.offset, filters.offset + limit - 1))
}
