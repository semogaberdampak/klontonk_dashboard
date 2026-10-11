import { fail, ok, type Result } from '~/models/result'
import type { ClientRef, Plan, Tenant } from '~/models/types'
import type { LookupsData } from '~/lib/lookups'
import { fetchAll } from './fetchAll'

/** Daftar acuan untuk dropdown dan filter. RLS tetap berlaku: client hanya melihat miliknya. */
export async function loadLookups(): Promise<Result<LookupsData>> {
  const [clients, plans, tenants] = await Promise.all([
    fetchAll<ClientRef>('clients', 'id,name,status', 'id'),
    fetchAll<Plan>('plans', 'code,name,price_month,max_branches,max_users,is_active,note', 'code'),
    fetchAll<Tenant>('tenants', 'id,name,client_id', 'id')
  ])
  if (!clients.ok) return fail(clients.error)
  if (!plans.ok) return fail(plans.error)
  if (!tenants.ok) return fail(tenants.error)
  return ok({ clients: clients.data, plans: plans.data, tenants: tenants.data })
}
