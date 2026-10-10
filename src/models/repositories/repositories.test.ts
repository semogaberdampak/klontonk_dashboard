import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callsOf, detachedAuthMock, fakeQuery, supabaseMock } from '@/test/fakeSupabase'

vi.mock('@/models/supabase', async () => {
  const mocks = await import('@/test/fakeSupabase')
  return { supabase: mocks.supabaseMock, createDetachedClient: () => ({ auth: mocks.detachedAuthMock }) }
})

import { dailyUsage } from './usageRepository'
import { fetchAll } from './fetchAll'
import { loadLookups } from './lookupRepository'
import { pageAuditLogs } from './auditLogRepository'
import { pageOverview } from './overviewRepository'
import { countUsersByTenant, createTenant, pageTenants } from './tenantRepository'
import { countEvents, pageEvents } from './eventRepository'
import { createProfile, isUsernameTaken, pageProfiles } from './profileRepository'
import { markExpired, pageSubscriptions } from './subscriptionRepository'
import { pageSales } from './salesRepository'
import { pageReturns } from './returnRepository'
import { purgeOldLogs, systemCounts } from './systemRepository'
import { createPlan } from './planRepository'
import { createClientWithPlan, setClientStatus } from './clientRepository'
import { fetchAdmin, signIn, signUpDetached } from './authRepository'

beforeEach(() => {
  vi.clearAllMocks()
})

function mockFrom(response: Parameters<typeof fakeQuery>[0]) {
  const { query, calls } = fakeQuery(response)
  supabaseMock.from.mockReturnValue(query)
  return calls
}

describe('pageOverview', () => {
  it('menyaring nama (ilike) dan status, menghitung total, dan memakai range', async () => {
    const calls = mockFrom({ data: [{ id: 'C1' }], count: 42 })
    const hasil = await pageOverview({ cari: 'warung', status: 'aktif', offset: 25 }, 25)

    expect(supabaseMock.from).toHaveBeenCalledWith('v_client_overview')
    expect(callsOf(calls, 'select')[0]).toEqual(['*', { count: 'exact' }])
    expect(callsOf(calls, 'ilike')).toEqual([['name', '%warung%']])
    expect(callsOf(calls, 'eq')).toEqual([['status', 'aktif']])
    expect(callsOf(calls, 'range')).toEqual([[25, 49]])
    expect(hasil).toEqual({ ok: true, data: { rows: [{ id: 'C1' }], total: 42 } })
  })

  it('tanpa filter tidak memanggil ilike/eq', async () => {
    const calls = mockFrom({ data: [], count: 0 })
    await pageOverview({ cari: '', status: '', offset: 0 }, 25)
    expect(callsOf(calls, 'ilike')).toHaveLength(0)
    expect(callsOf(calls, 'eq')).toHaveLength(0)
  })
})

describe('pageTenants & countUsersByTenant', () => {
  it('menyaring client dan nama cabang', async () => {
    const calls = mockFrom({ data: [], count: 0 })
    await pageTenants({ client: 'C0001', cari: 'pasar', offset: 0 }, 25)
    expect(callsOf(calls, 'eq')).toEqual([['client_id', 'C0001']])
    expect(callsOf(calls, 'ilike')).toEqual([['name', '%pasar%']])
  })

  it('menghitung pengguna per cabang dalam satu query', async () => {
    const calls = mockFrom({ data: [{ tenant_id: 'T1' }, { tenant_id: 'T1' }, { tenant_id: 'T2' }] })
    expect(await countUsersByTenant(['T1', 'T2'])).toEqual({ T1: 2, T2: 1 })
    expect(callsOf(calls, 'in')).toEqual([['tenant_id', ['T1', 'T2']]])
  })

  it('tidak memanggil database bila daftar cabang kosong, dan {} bila gagal', async () => {
    expect(await countUsersByTenant([])).toEqual({})
    expect(supabaseMock.from).not.toHaveBeenCalled()
    mockFrom({ data: null, error: { message: 'x' } })
    expect(await countUsersByTenant(['T1'])).toEqual({})
  })

  it('createTenant mengembalikan cabang baru dengan ID dari database', async () => {
    mockFrom({ data: { id: 'T009', name: 'Baru', client_id: 'C1' } })
    expect(await createTenant('C1', 'Baru')).toEqual({ ok: true, data: { id: 'T009', name: 'Baru', client_id: 'C1' } })
  })

  it('createTenant gagal bila database tidak mengembalikan baris', async () => {
    mockFrom({ data: null })
    const hasil = await createTenant('C1', 'Baru')
    expect(hasil.ok).toBe(false)
  })
})

describe('pageProfiles', () => {
  it('daftar cabang kosong tetap memakai in() agar hasil kosong, bukan semua baris', async () => {
    const calls = mockFrom({ data: [], count: 0 })
    await pageProfiles({ tenantIds: [], cari: '', offset: 0 }, 25)
    expect(callsOf(calls, 'in')).toEqual([['tenant_id', []]])
  })

  it('undefined = tanpa filter cabang; kata kunci dicari di username dan nama', async () => {
    const calls = mockFrom({ data: [], count: 0 })
    await pageProfiles({ tenantIds: undefined, cari: 'budi', offset: 0 }, 25)
    expect(callsOf(calls, 'in')).toHaveLength(0)
    expect(callsOf(calls, 'or')).toEqual([['username.ilike.*budi*,name.ilike.*budi*']])
  })

  it('isUsernameTaken dan createProfile', async () => {
    mockFrom({ data: [{ id: 'u1' }] })
    expect(await isUsernameTaken('c1.budi')).toEqual({ ok: true, data: true })
    const calls = mockFrom({ data: null })
    await createProfile({ id: 'u1', username: 'c1.budi', name: 'Budi', role: 'cashier', avatar: 'B', tenantId: 'T1' })
    expect(callsOf(calls, 'insert')[0]).toEqual([{ id: 'u1', username: 'c1.budi', name: 'Budi', role: 'cashier', avatar: 'B', tenant_id: 'T1' }])
  })
})

describe('log & transaksi: filter tanggal, cabang, dan kata kunci', () => {
  it('audit log: rentang waktu memakai gte dan lte pada kolom at', async () => {
    const calls = mockFrom({ data: [], count: 0 })
    await pageAuditLogs(
      { tenantIds: ['T1'], aksi: 'sale.checkout', pelaku: 'budi', dariIso: '2026-01-01T00:00:00.000Z', sampaiIso: '2026-01-31T00:00:00.000Z', offset: 0 },
      50
    )
    expect(callsOf(calls, 'gte')).toEqual([['at', '2026-01-01T00:00:00.000Z']])
    expect(callsOf(calls, 'lte')).toEqual([['at', '2026-01-31T00:00:00.000Z']])
    expect(callsOf(calls, 'eq')).toEqual([['action', 'sale.checkout']])
    expect(callsOf(calls, 'ilike')).toEqual([['actor_name', '%budi%']])
  })

  it('penjualan: kata kunci mencari nomor dan kasir', async () => {
    const calls = mockFrom({ data: [], count: 0 })
    await pageSales({ tenantIds: undefined, dariIso: '', sampaiIso: '', metode: 'tunai', cari: 'TRX', offset: 0 }, 50)
    expect(callsOf(calls, 'or')).toEqual([['no.ilike.*TRX*,cashier.ilike.*TRX*']])
    expect(callsOf(calls, 'eq')).toEqual([['method', 'tunai']])
  })

  it('retur: kata kunci mencari nomor, barang, dan kasir', async () => {
    const calls = mockFrom({ data: [], count: 0 })
    await pageReturns({ tenantIds: undefined, dariIso: '', sampaiIso: '', jenis: 'supplier', alasan: 'rusak', cari: 'RTR', offset: 0 }, 50)
    expect(callsOf(calls, 'or')).toEqual([['no.ilike.*RTR*,name.ilike.*RTR*,cashier.ilike.*RTR*']])
    expect(callsOf(calls, 'eq')).toEqual([['kind', 'supplier'], ['reason', 'rusak']])
  })

  it('log teknis: filter client_id dan pesan; countEvents memakai head request', async () => {
    const calls = mockFrom({ data: [], count: 0 })
    await pageEvents({ level: 'error', tenantIds: undefined, clientId: 'C1', cari: 'gagal', dariIso: '', sampaiIso: '', offset: 0 }, 50)
    expect(callsOf(calls, 'eq')).toEqual([['level', 'error'], ['client_id', 'C1']])
    expect(callsOf(calls, 'ilike')).toEqual([['message', '%gagal%']])

    const countCalls = mockFrom({ data: null, count: 7 })
    expect(await countEvents('warn', 'C1', '2026-01-31T00:00:00.000Z')).toBe(7)
    expect(callsOf(countCalls, 'select')[0]).toEqual(['id', { count: 'exact', head: true }])
  })
})

describe('langganan', () => {
  it('markExpired hanya menyentuh trial/aktif yang sudah lewat dan mengembalikan jumlahnya', async () => {
    const calls = mockFrom({ data: [{ id: 1 }, { id: 2 }] })
    expect(await markExpired('2026-05-10')).toEqual({ ok: true, data: 2 })
    expect(callsOf(calls, 'update')).toEqual([[{ status: 'jatuh_tempo' }]])
    expect(callsOf(calls, 'lt')).toEqual([['expires_at', '2026-05-10']])
    expect(callsOf(calls, 'in')).toEqual([['status', ['trial', 'aktif']]])
  })

  it('pageSubscriptions menyaring client dan status', async () => {
    const calls = mockFrom({ data: [], count: 0 })
    await pageSubscriptions({ client: 'C1', status: 'trial', offset: 0 }, 25)
    expect(callsOf(calls, 'eq')).toEqual([['client_id', 'C1'], ['status', 'trial']])
  })
})

describe('paket, client, RPC', () => {
  it('createPlan menyertakan kode', async () => {
    const calls = mockFrom({ data: null })
    await createPlan('umkm', { name: 'UMKM', price_month: 1, max_branches: 1, max_users: 1, is_active: true, note: null })
    expect(callsOf(calls, 'insert')[0]).toEqual([{ code: 'umkm', name: 'UMKM', price_month: 1, max_branches: 1, max_users: 1, is_active: true, note: null }])
  })

  it('setClientStatus memperbarui baris yang tepat', async () => {
    const calls = mockFrom({ data: null })
    await setClientStatus('C1', 'suspend')
    expect(callsOf(calls, 'update')).toEqual([[{ status: 'suspend' }]])
    expect(callsOf(calls, 'eq')).toEqual([['id', 'C1']])
  })

  it('createClientWithPlan memetakan argumen RPC', async () => {
    supabaseMock.rpc.mockReturnValue(fakeQuery({ data: 'ok' }).query)
    await createClientWithPlan({ name: 'A', planCode: 'basic', contactName: null, contactPhone: '08', contactEmail: null, trialDays: 14, note: null })
    expect(supabaseMock.rpc).toHaveBeenCalledWith('create_client_with_plan', {
      p_name: 'A', p_plan_code: 'basic', p_contact_name: null, p_contact_phone: '08', p_contact_email: null, p_trial_days: 14, p_note: null
    })
  })

  it('dailyUsage dan purgeOldLogs memanggil RPC yang benar', async () => {
    supabaseMock.rpc.mockReturnValue(fakeQuery({ data: [] }).query)
    await dailyUsage('C1', '2026-01-01', '2026-01-31')
    expect(supabaseMock.rpc).toHaveBeenCalledWith('usage_daily', { p_client: 'C1', p_from: '2026-01-01', p_to: '2026-01-31' })
    await purgeOldLogs(180, 60)
    expect(supabaseMock.rpc).toHaveBeenCalledWith('purge_old_logs', { p_audit_days: 180, p_event_days: 60 })
  })
})

describe('fetchAll & loadLookups', () => {
  it('mengambil halaman berikutnya selama halaman penuh (500 baris)', async () => {
    const penuh = Array.from({ length: 500 }, (_, i) => ({ id: i }))
    supabaseMock.from
      .mockReturnValueOnce(fakeQuery({ data: penuh }).query)
      .mockReturnValueOnce(fakeQuery({ data: [{ id: 500 }] }).query)
    const hasil = await fetchAll<{ id: number }>('clients', 'id', 'id')
    expect(hasil.ok && hasil.data).toHaveLength(501)
    expect(supabaseMock.from).toHaveBeenCalledTimes(2)
  })

  it('meneruskan error pertama', async () => {
    mockFrom({ data: null, error: { message: 'putus' }, status: 500 })
    expect((await fetchAll('clients', 'id', 'id')).ok).toBe(false)
  })

  it('loadLookups menggabungkan tiga daftar, atau gagal bila salah satunya gagal', async () => {
    supabaseMock.from.mockImplementation((tabel: string) => fakeQuery({ data: [{ tabel }] }).query)
    const hasil = await loadLookups()
    expect(hasil.ok && Object.keys(hasil.data)).toEqual(['clients', 'plans', 'tenants'])

    supabaseMock.from.mockImplementation((tabel: string) => fakeQuery(tabel === 'plans' ? { data: null, error: { message: 'x' } } : { data: [] }).query)
    expect((await loadLookups()).ok).toBe(false)
  })
})

describe('systemCounts', () => {
  it('mengembalikan null untuk tabel yang gagal dibaca tanpa menggagalkan yang lain', async () => {
    supabaseMock.from.mockImplementation((tabel: string) =>
      fakeQuery(tabel === 'profiles' ? { data: null, error: { message: 'x' } } : { data: null, count: 3 }).query
    )
    expect(await systemCounts()).toEqual({ klien: 3, cabang: 3, pengguna: null, logAudit: 3, logTeknis: 3 })
  })
})

describe('authRepository', () => {
  it('fetchAdmin memakai maybeSingle pada platform_admins', async () => {
    const calls = mockFrom({ data: { id: 'u1', name: 'Admin' } })
    expect(await fetchAdmin('u1')).toEqual({ ok: true, data: { id: 'u1', name: 'Admin' } })
    expect(callsOf(calls, 'eq')).toEqual([['id', 'u1']])
    expect(callsOf(calls, 'maybeSingle')).toHaveLength(1)
  })

  it('signIn: sukses mengembalikan uid; gagal membawa status HTTP', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null })
    expect(await signIn('a@b.c', 'pw')).toEqual({ ok: true, data: { uid: 'u1' } })

    supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid login credentials', status: 400 } })
    const gagal = await signIn('a@b.c', 'salah')
    expect(gagal.ok).toBe(false)
    if (!gagal.ok) expect(gagal.error.status).toBe(400)
  })

  it('signUpDetached memakai klien tanpa sesi', async () => {
    detachedAuthMock.signUp.mockResolvedValueOnce({ data: { user: { id: 'u2' } }, error: null })
    expect(await signUpDetached('c1.budi@klontonk.local', 'rahasia123')).toEqual({ ok: true, data: { userId: 'u2' } })
    expect(supabaseMock.auth.signInWithPassword).not.toHaveBeenCalled()
  })
})
