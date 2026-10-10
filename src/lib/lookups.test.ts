import { describe, expect, it } from 'vitest'
import { createLookupsApi, tenantIdsFor, type LookupsData } from './lookups'

const data: LookupsData = {
  clients: [
    { id: 'C0001', name: 'Warung Sari', status: 'aktif' },
    { id: 'C0002', name: 'Toko Budi', status: 'suspend' }
  ],
  plans: [
    { code: 'basic', name: 'Basic', price_month: 100000, max_branches: 1, max_users: 3, is_active: true, note: null },
    { code: 'old', name: 'Lama', price_month: 0, max_branches: 1, max_users: 1, is_active: false, note: null },
    { code: 'internal', name: 'Internal', price_month: 0, max_branches: 99, max_users: 99, is_active: true, note: null }
  ],
  tenants: [
    { id: 'T001', name: 'Pusat', client_id: 'C0001' },
    { id: 'T002', name: 'Pasar', client_id: 'C0001' },
    { id: 'T003', name: 'Utama', client_id: 'C0002' }
  ]
}
const api = createLookupsApi(data)

describe('pencarian', () => {
  it('menemukan client dan memberi fallback nama', () => {
    expect(api.clientName('C0001')).toBe('Warung Sari')
    expect(api.clientName('C9999')).toBe('C9999')
    expect(api.clientName(undefined)).toBe('-')
  })

  it('menyaring cabang per client', () => {
    expect(api.tenantsOf('C0001').map((t) => t.id)).toEqual(['T001', 'T002'])
    expect(api.tenantsOf(null)).toHaveLength(3)
  })
})

describe('opsi dropdown', () => {
  it('menambah pilihan "Semua" di depan bila diminta', () => {
    expect(api.clientOptions({ includeAll: true })[0]).toEqual({ value: '', label: 'Semua klien' })
    expect(api.clientOptions()).toHaveLength(2)
  })

  it('menyaring client berdasarkan status', () => {
    expect(api.clientOptions({ status: 'aktif' }).map((o) => o.value)).toEqual(['C0001'])
  })

  it('menyaring paket aktif dan membuang paket internal', () => {
    expect(api.planOptions({ activeOnly: true, excludeInternal: true }).map((o) => o.value)).toEqual(['basic'])
  })

  it('menambahkan nama client pada label cabang bila withClient', () => {
    expect(api.tenantOptions({ clientId: 'C0002', withClient: true })[0]?.label).toBe('Utama (T003) - Toko Budi')
  })
})

describe('tenantIdsFor', () => {
  it('memprioritaskan cabang yang dipilih', () => {
    expect(tenantIdsFor(api, 'C0001', 'T002')).toEqual(['T002'])
  })

  it('memakai semua cabang milik client bila cabang tidak dipilih', () => {
    expect(tenantIdsFor(api, 'C0001', '')).toEqual(['T001', 'T002'])
  })

  it('undefined bila tidak ada filter, daftar kosong bila client tanpa cabang', () => {
    expect(tenantIdsFor(api, '', '')).toBeUndefined()
    expect(tenantIdsFor(createLookupsApi({ ...data, tenants: [] }), 'C0001', '')).toEqual([])
  })
})
