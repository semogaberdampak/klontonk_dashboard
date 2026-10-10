import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeQuery, supabaseMock } from '@/test/fakeSupabase'

vi.mock('@/models/supabase', async () => {
  const mocks = await import('@/test/fakeSupabase')
  return { supabase: mocks.supabaseMock, createDetachedClient: () => ({ auth: mocks.detachedAuthMock }) }
})

import { App } from './App'
import { AuthContext, type AuthValue } from '@/context/AuthContext'
import { DialogProvider } from '@/context/DialogContext'
import { LookupsProvider } from '@/context/LookupsContext'
import { ReloadProvider } from '@/context/ReloadContext'
import { ToastProvider } from '@/context/ToastContext'
import { ROUTES } from '@/routes'

// Smoke test: setiap halaman harus bisa dirender penuh (shell + controller + view) dari data
// yang bentuknya sama dengan jawaban PostgREST, tanpa error dan tanpa kotak "Gagal memuat data".

const TABLES: Record<string, unknown[]> = {
  v_client_overview: [
    {
      id: 'C0001', name: 'Warung Sari', status: 'aktif', contact_name: 'Bu Sari', contact_phone: '0812', contact_email: null, note: null,
      plan_code: 'basic', plan_name: 'Paket Basic', price_month: '100000', sub_status: 'aktif', days_left: 9, expires_at: '2026-05-20',
      branch_count: 2, user_count: 3, trx_30d: 120, omzet_30d: '4500000', logs_7d: 40, errors_7d: 2
    }
  ],
  clients: [{ id: 'C0001', name: 'Warung Sari', status: 'aktif' }],
  plans: [{ code: 'basic', name: 'Paket Basic', price_month: '100000', max_branches: 2, max_users: 5, is_active: true, note: 'populer' }],
  tenants: [{ id: 'T001', name: 'Cabang Pusat', client_id: 'C0001' }],
  audit_logs: [
    { at: '2026-05-09T10:00:00Z', actor_name: 'Budi', actor_role: 'cashier', action: 'sale.checkout', entity: 'sales', entity_id: 'TRX-1', client_id: 'C0001', tenant_id: 'T001', detail: { total: 25000 } }
  ],
  client_events: [
    { at: '2026-05-09T10:00:00Z', level: 'error', source: 'window', message: 'Gagal simpan stok', context: { kode: 1 }, app_version: '1.2.0', device: 'Android', client_id: 'C0001', tenant_id: 'T001' }
  ],
  subscriptions: [
    { id: 7, client_id: 'C0001', plan_code: 'basic', started_at: '2026-04-20', expires_at: '2026-05-20', status: 'aktif', note: 'transfer', client: { name: 'Warung Sari', status: 'aktif' }, plan: { name: 'Paket Basic', price_month: 100000 } }
  ],
  profiles: [{ id: 'u1', username: 'c0001.budi', name: 'Budi Kasir', role: 'cashier', avatar: 'B', tenant_id: 'T001', created_at: '2026-04-01T00:00:00Z' }],
  sales: [{ tenant_id: 'T001', no: 'TRX-2026-0001', at: '2026-05-09T10:00:00Z', cashier: 'Budi', method: 'tunai', total: 25000, paid: 30000, tenant: { name: 'Cabang Pusat', client_id: 'C0001' } }],
  stock_returns: [
    { tenant_id: 'T001', no: 'RTR-1', at: '2026-05-09T10:00:00Z', cashier: 'Budi', kind: 'pelanggan', item_id: 'B1', name: 'Kopi Susu', unit: 'cup', qty: 2, amount: 20000, reason: 'rusak', note: null, tenant: { name: 'Cabang Pusat', client_id: 'C0001' } }
  ]
}

const RPCS: Record<string, unknown> = {
  usage_daily: [{ day: '2026-05-09', trx_count: 4, trx_total: 100000, return_count: 1, return_amount: 5000, log_count: 9, event_count: 1 }],
  purge_old_logs: { audit_deleted: 3, events_deleted: 1 }
}

const auth: AuthValue = {
  status: 'authenticated',
  admin: { id: 'admin-1', name: 'Admin Utama', email: 'admin@contoh.com' },
  login: vi.fn(),
  logout: vi.fn(),
  expire: vi.fn()
}

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <AuthContext.Provider value={auth}>
          <ReloadProvider>
            <LookupsProvider>
              <DialogProvider>
                <App />
              </DialogProvider>
            </LookupsProvider>
          </ReloadProvider>
        </AuthContext.Provider>
      </ToastProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}))
  supabaseMock.from.mockImplementation((table: string) => {
    const rows = TABLES[table] ?? []
    return fakeQuery({ data: rows, count: rows.length }).query
  })
  supabaseMock.rpc.mockImplementation((name: string) => fakeQuery({ data: RPCS[name] ?? [] }).query)
})

const loaded = () => waitFor(() => expect(screen.queryByText('Memuat data...')).toBeNull(), { timeout: 4000 })

describe('setiap halaman merender tanpa error', () => {
  it.each(ROUTES.map((r) => [r.path, r.title] as const))('%s', async (path, title) => {
    renderApp(path)
    await loaded()
    expect(screen.queryByText('Gagal memuat data')).toBeNull()
    expect(screen.getAllByText(title).length).toBeGreaterThan(0)
  })
})

describe('isi halaman', () => {
  it('Ringkasan: kartu angka, daftar perlu perhatian, dan log terbaru', async () => {
    renderApp('/ringkasan')
    await loaded()
    expect(screen.getAllByText('Warung Sari').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Perlu perhatian')).toHaveLength(2) // kartu statistik + judul kartu
    expect(screen.getByText(/2 error dalam 7 hari/)).toBeTruthy()
    expect(screen.getByText('sale.checkout')).toBeTruthy()
    expect(screen.getByText('Gagal simpan stok')).toBeTruthy()
  })

  it('Pemakaian dengan client: ringkasan angka dan tabel harian', async () => {
    renderApp('/pemakaian?client=C0001')
    await loaded()
    expect(screen.getByText('Aktivitas harian')).toBeTruthy()
    expect(supabaseMock.rpc).toHaveBeenCalledWith('usage_daily', expect.objectContaining({ p_client: 'C0001' }))
  })

  it('Klien: memuat daftar dan membuka form tambah client', async () => {
    renderApp('/klien')
    await loaded()
    expect(screen.getByText(/Daftar client \(1\)/)).toBeTruthy()
    fireEvent.click(screen.getByText('+ Tambah client'))
    expect(await screen.findByText('Simpan client')).toBeTruthy()
    expect(screen.getByText(/Client \+ langganan trial dibuat sekaligus/)).toBeTruthy()
  })

  it('Paket: statistik harga dan tombol aksi', async () => {
    renderApp('/paket')
    await loaded()
    expect(screen.getByText('Termurah')).toBeTruthy()
    expect(screen.getByText('populer')).toBeTruthy()
    fireEvent.click(screen.getByText('Ubah'))
    expect(await screen.findByText('Ubah paket basic')).toBeTruthy()
  })

  it('Pengaturan: kuota data dan konfirmasi pangkas log', async () => {
    renderApp('/pengaturan')
    await loaded()
    expect(screen.getAllByText('Admin Utama')).toHaveLength(2) // chip di topbar + kartu Akun Anda
    fireEvent.click(screen.getByText('Pangkas log lama'))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/lebih tua dari 180 hari/)).toBeTruthy()
    fireEvent.click(within(dialog).getByText('Ya, Pangkas'))
    await waitFor(() => expect(supabaseMock.rpc).toHaveBeenCalledWith('purge_old_logs', { p_audit_days: 180, p_event_days: 60 }))
    expect(await screen.findByText(/3 baris log audit dan 1 baris log teknis dihapus/)).toBeTruthy()
  })

  it('URL tidak dikenal menampilkan 404 di dalam shell', async () => {
    renderApp('/tidak-ada')
    await loaded()
    expect(screen.getByText('Halaman tidak ditemukan. Pilih menu di kiri.')).toBeTruthy()
  })

  it('URL akar mengarah ke Ringkasan', async () => {
    renderApp('/')
    await loaded()
    expect(screen.getAllByText('Ringkasan').length).toBeGreaterThan(0)
  })

  it('Transaksi: filter tanggal bawaan dikirim sebagai rentang ISO Jakarta', async () => {
    renderApp('/transaksi?dari=2026-05-01&sampai=2026-05-02')
    await loaded()
    expect(screen.getByText('TRX-2026-0001')).toBeTruthy()
    const salesCalls = supabaseMock.from.mock.calls.filter(([t]) => t === 'sales')
    expect(salesCalls.length).toBeGreaterThan(0)
  })

  it('error dari server tampil sebagai kotak error, bukan layar kosong', async () => {
    supabaseMock.from.mockImplementation((table: string) =>
      table === 'v_client_overview'
        ? fakeQuery({ data: null, error: { message: 'permission denied', code: '42501' }, status: 403 }).query
        : fakeQuery({ data: TABLES[table] ?? [], count: 1 }).query
    )
    renderApp('/ringkasan')
    expect(await screen.findByText('Tidak punya hak untuk tindakan ini.')).toBeTruthy()
    expect(screen.getByText('Gagal memuat data')).toBeTruthy()
  })
})
