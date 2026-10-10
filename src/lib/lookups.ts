import type { ClientRef, Plan, Tenant } from '@/models/types'

// Selektor murni atas daftar acuan (klien, paket, cabang) untuk dropdown dan label tabel.

export interface LookupsData {
  clients: ClientRef[]
  plans: Plan[]
  tenants: Tenant[]
}

export interface Option {
  value: string
  label: string
}

export const EMPTY_LOOKUPS: LookupsData = { clients: [], plans: [], tenants: [] }

const withAll = (opsi: Option[], includeAll: boolean, allLabel: string): Option[] =>
  includeAll ? [{ value: '', label: allLabel }, ...opsi] : opsi

export interface LookupsApi {
  data: LookupsData
  client(id: string | null | undefined): ClientRef | null
  clientName(id: string | null | undefined): string
  plan(code: string | null | undefined): Plan | null
  tenant(id: string | null | undefined): Tenant | null
  tenantsOf(clientId?: string | null): Tenant[]
  clientOptions(opts?: { includeAll?: boolean; allLabel?: string; status?: ClientRef['status'] }): Option[]
  planOptions(opts?: { includeAll?: boolean; allLabel?: string; activeOnly?: boolean; excludeInternal?: boolean }): Option[]
  tenantOptions(opts?: { clientId?: string | null; includeAll?: boolean; allLabel?: string; withClient?: boolean }): Option[]
}

export function createLookupsApi(data: LookupsData): LookupsApi {
  const api: LookupsApi = {
    data,
    client: (id) => data.clients.find((c) => c.id === id) ?? null,
    clientName: (id) => api.client(id)?.name ?? id ?? '-',
    plan: (code) => data.plans.find((p) => p.code === code) ?? null,
    tenant: (id) => data.tenants.find((t) => t.id === id) ?? null,
    tenantsOf: (clientId) => data.tenants.filter((t) => !clientId || t.client_id === clientId),

    clientOptions: ({ includeAll = false, allLabel = 'Semua klien', status } = {}) =>
      withAll(
        data.clients.filter((c) => !status || c.status === status).map((c) => ({ value: c.id, label: `${c.id} - ${c.name}` })),
        includeAll,
        allLabel
      ),

    planOptions: ({ includeAll = false, allLabel = 'Semua paket', activeOnly = false, excludeInternal = false } = {}) =>
      withAll(
        data.plans
          .filter((p) => (!activeOnly || p.is_active) && (!excludeInternal || p.code !== 'internal'))
          .map((p) => ({ value: p.code, label: `${p.name} (${p.code})` })),
        includeAll,
        allLabel
      ),

    tenantOptions: ({ clientId = null, includeAll = false, allLabel = 'Semua cabang', withClient = false } = {}) =>
      withAll(
        api.tenantsOf(clientId).map((t) => ({
          value: t.id,
          label: withClient ? `${t.name} (${t.id}) - ${api.clientName(t.client_id)}` : `${t.name} (${t.id})`
        })),
        includeAll,
        allLabel
      )
  }
  return api
}

/**
 * Filter client/cabang -> daftar id cabang untuk klausa `in`. Undefined bila tidak ada filter;
 * daftar kosong bila client dipilih tetapi belum punya cabang (hasil query pun kosong).
 */
export function tenantIdsFor(lookups: LookupsApi, clientId: string, tenantId: string): string[] | undefined {
  if (tenantId) return [tenantId]
  if (clientId) return lookups.tenantsOf(clientId).map((t) => t.id)
  return undefined
}
