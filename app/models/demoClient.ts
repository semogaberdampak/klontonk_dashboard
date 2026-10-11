// MODE DEMO: pengganti klien Supabase yang berjalan sepenuhnya di browser dengan data contoh,
// supaya seluruh dashboard bisa dilihat tanpa koneksi, akun, atau database. Hanya aktif bila
// aplikasi dibangun dengan VITE_DEMO_MODE=true (npm run dev:demo / npm run build:demo).
// Perubahan (tambah/ubah/hapus) dianggap berhasil tetapi TIDAK disimpan.

type Row = Record<string, unknown>

const DEMO_ADMIN: Row = { id: 'demo-admin', name: 'Admin Demo' }

const isoDaysAgo = (days: number, hour = 10): string => {
  const d = new Date(Date.now() - days * 86_400_000)
  d.setUTCHours(hour, 15, 0, 0)
  return d.toISOString()
}
const dateAhead = (days: number): string => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

const TABLES: Record<string, Row[]> = {
  platform_admins: [DEMO_ADMIN],
  clients: [
    { id: 'C0001', name: 'Warung Bu Sari', status: 'aktif', contact_name: 'Bu Sari', contact_phone: '081234567890', contact_email: 'sari@contoh.com', note: null },
    { id: 'C0002', name: 'Toko Sembako Budi', status: 'aktif', contact_name: 'Pak Budi', contact_phone: '081298765432', contact_email: null, note: 'Pelanggan sejak 2025' },
    { id: 'C0003', name: 'Kedai Kopi Senja', status: 'suspend', contact_name: 'Rani', contact_phone: '085611223344', contact_email: 'rani@kopisenja.id', note: null }
  ],
  plans: [
    { code: 'umkm_basic', name: 'UMKM Basic', price_month: 100000, max_branches: 1, max_users: 3, is_active: true, note: 'Untuk satu warung' },
    { code: 'umkm_plus', name: 'UMKM Plus', price_month: 250000, max_branches: 3, max_users: 10, is_active: true, note: null },
    { code: 'internal', name: 'Internal', price_month: 0, max_branches: 99, max_users: 99, is_active: true, note: 'Non-langganan' }
  ],
  tenants: [
    { id: 'T001', name: 'Warung Pusat', client_id: 'C0001' },
    { id: 'T002', name: 'Warung Pasar', client_id: 'C0001' },
    { id: 'T003', name: 'Toko Utama', client_id: 'C0002' },
    { id: 'T004', name: 'Kedai Senja', client_id: 'C0003' }
  ],
  v_client_overview: [
    {
      id: 'C0001', name: 'Warung Bu Sari', status: 'aktif', contact_name: 'Bu Sari', contact_phone: '081234567890', contact_email: 'sari@contoh.com', note: null,
      plan_code: 'umkm_plus', plan_name: 'UMKM Plus', price_month: 250000, sub_status: 'aktif', days_left: 92, expires_at: dateAhead(92),
      branch_count: 2, user_count: 5, trx_30d: 1284, omzet_30d: 38_450_000, logs_7d: 310, errors_7d: 0
    },
    {
      id: 'C0002', name: 'Toko Sembako Budi', status: 'aktif', contact_name: 'Pak Budi', contact_phone: '081298765432', contact_email: null, note: 'Pelanggan sejak 2025',
      plan_code: 'umkm_basic', plan_name: 'UMKM Basic', price_month: 100000, sub_status: 'aktif', days_left: 9, expires_at: dateAhead(9),
      branch_count: 1, user_count: 2, trx_30d: 642, omzet_30d: 21_900_000, logs_7d: 120, errors_7d: 3
    },
    {
      id: 'C0003', name: 'Kedai Kopi Senja', status: 'suspend', contact_name: 'Rani', contact_phone: '085611223344', contact_email: 'rani@kopisenja.id', note: null,
      plan_code: 'umkm_basic', plan_name: 'UMKM Basic', price_month: 100000, sub_status: 'jatuh_tempo', days_left: -12, expires_at: dateAhead(-12),
      branch_count: 1, user_count: 2, trx_30d: 18, omzet_30d: 540_000, logs_7d: 4, errors_7d: 0
    }
  ],
  subscriptions: [
    { id: 1, client_id: 'C0001', plan_code: 'umkm_plus', started_at: dateAhead(-273), expires_at: dateAhead(92), status: 'aktif', note: 'Transfer 1 tahun', client: { name: 'Warung Bu Sari', status: 'aktif' }, plan: { name: 'UMKM Plus', price_month: 250000 } },
    { id: 2, client_id: 'C0002', plan_code: 'umkm_basic', started_at: dateAhead(-21), expires_at: dateAhead(9), status: 'aktif', note: null, client: { name: 'Toko Sembako Budi', status: 'aktif' }, plan: { name: 'UMKM Basic', price_month: 100000 } },
    { id: 3, client_id: 'C0003', plan_code: 'umkm_basic', started_at: dateAhead(-42), expires_at: dateAhead(-12), status: 'jatuh_tempo', note: 'Belum bayar', client: { name: 'Kedai Kopi Senja', status: 'suspend' }, plan: { name: 'UMKM Basic', price_month: 100000 } }
  ],
  profiles: [
    { id: 'u1', username: 'c0001.sari', name: 'Bu Sari', role: 'admin', avatar: 'B', tenant_id: 'T001', created_at: isoDaysAgo(270) },
    { id: 'u2', username: 'c0001.dewi', name: 'Dewi Kasir', role: 'cashier', avatar: 'D', tenant_id: 'T001', created_at: isoDaysAgo(260) },
    { id: 'u3', username: 'c0002.budi', name: 'Pak Budi', role: 'admin', avatar: 'P', tenant_id: 'T003', created_at: isoDaysAgo(120) },
    { id: 'u4', username: 'c0003.rani', name: 'Rani', role: 'admin', avatar: 'R', tenant_id: 'T004', created_at: isoDaysAgo(40) }
  ],
  audit_logs: [
    { at: isoDaysAgo(0, 9), actor_name: 'Dewi Kasir', actor_role: 'cashier', action: 'sale.checkout', entity: 'sales', entity_id: 'TRX-2026-0412', client_id: 'C0001', tenant_id: 'T001', detail: { total: 87500, method: 'tunai' } },
    { at: isoDaysAgo(0, 8), actor_name: 'Bu Sari', actor_role: 'admin', action: 'price.update', entity: 'stock_items', entity_id: 'B-017', client_id: 'C0001', tenant_id: 'T001', detail: { price: { dari: 12000, jadi: 13500 } } },
    { at: isoDaysAgo(1, 14), actor_name: 'Pak Budi', actor_role: 'admin', action: 'stock.update', entity: 'stock_items', entity_id: 'B-102', client_id: 'C0002', tenant_id: 'T003', detail: { qty: { dari: 40, jadi: 32 } } },
    { at: isoDaysAgo(2, 11), actor_name: 'Admin Demo', actor_role: 'superadmin', action: 'subscription.update', entity: 'subscriptions', entity_id: '2', client_id: 'C0002', tenant_id: null, detail: { status: { dari: 'trial', jadi: 'aktif' } } },
    { at: isoDaysAgo(3, 16), actor_name: 'Rani', actor_role: 'admin', action: 'user.delete', entity: 'profiles', entity_id: 'c0003.andi', client_id: 'C0003', tenant_id: 'T004', detail: { username: 'c0003.andi' } }
  ],
  client_events: [
    { at: isoDaysAgo(0, 7), level: 'error', source: 'StockStore', message: 'Gagal menyimpan stok ke database (timeout)', context: { item: 'B-102', percobaan: 3 }, app_version: '1.4.2', device: 'Android 13', client_id: 'C0002', tenant_id: 'T003' },
    { at: isoDaysAgo(1, 15), level: 'error', source: 'window', message: 'Uncaught TypeError: Cannot read properties of undefined', context: null, app_version: '1.4.2', device: 'Chrome 126', client_id: 'C0002', tenant_id: 'T003' },
    { at: isoDaysAgo(2, 10), level: 'warn', source: 'sync', message: 'Antrian sinkron menumpuk (12 item)', context: { antrian: 12 }, app_version: '1.4.1', device: 'Android 12', client_id: 'C0001', tenant_id: 'T002' },
    { at: isoDaysAgo(4, 9), level: 'info', source: 'app', message: 'Aplikasi diperbarui ke 1.4.2', context: null, app_version: '1.4.2', device: 'Chrome 126', client_id: 'C0001', tenant_id: 'T001' }
  ],
  sales: [
    { tenant_id: 'T001', no: 'TRX-2026-0412', at: isoDaysAgo(0, 9), cashier: 'Dewi Kasir', method: 'tunai', total: 87500, paid: 100000, tenant: { name: 'Warung Pusat', client_id: 'C0001' } },
    { tenant_id: 'T001', no: 'TRX-2026-0411', at: isoDaysAgo(0, 8), cashier: 'Dewi Kasir', method: 'nontunai', total: 154000, paid: 154000, tenant: { name: 'Warung Pusat', client_id: 'C0001' } },
    { tenant_id: 'T002', no: 'TRX-2026-0410', at: isoDaysAgo(1, 17), cashier: 'Bu Sari', method: 'tunai', total: 32000, paid: 50000, tenant: { name: 'Warung Pasar', client_id: 'C0001' } },
    { tenant_id: 'T003', no: 'TRX-2026-0409', at: isoDaysAgo(1, 13), cashier: 'Pak Budi', method: 'tunai', total: 212500, paid: 250000, tenant: { name: 'Toko Utama', client_id: 'C0002' } },
    { tenant_id: 'T003', no: 'TRX-2026-0408', at: isoDaysAgo(2, 12), cashier: 'Pak Budi', method: 'nontunai', total: 98000, paid: 98000, tenant: { name: 'Toko Utama', client_id: 'C0002' } }
  ],
  stock_returns: [
    { tenant_id: 'T001', no: 'RTR-2026-0031', at: isoDaysAgo(0, 10), cashier: 'Dewi Kasir', kind: 'pelanggan', item_id: 'B-017', name: 'Kopi Susu 250ml', unit: 'cup', qty: 2, amount: 27000, reason: 'salah_barang', note: 'Pesanan tertukar', tenant: { name: 'Warung Pusat', client_id: 'C0001' } },
    { tenant_id: 'T003', no: 'RTR-2026-0030', at: isoDaysAgo(3, 11), cashier: 'Pak Budi', kind: 'supplier', item_id: 'B-102', name: 'Minyak Goreng 1L', unit: 'pcs', qty: 6, amount: 0, reason: 'kedaluwarsa', note: null, tenant: { name: 'Toko Utama', client_id: 'C0002' } }
  ]
}

const usageDaily = (): Row[] =>
  Array.from({ length: 14 }, (_, i) => ({
    day: new Date(Date.now() - (13 - i) * 86_400_000).toISOString().slice(0, 10),
    trx_count: 30 + ((i * 7) % 25),
    trx_total: 900_000 + ((i * 137_000) % 700_000),
    return_count: i % 4 === 0 ? 1 : 0,
    return_amount: i % 4 === 0 ? 27_000 : 0,
    log_count: 60 + ((i * 11) % 40),
    event_count: i % 6 === 0 ? 2 : 0
  }))

const RPC: Record<string, unknown> = {
  usage_daily: usageDaily,
  purge_old_logs: { audit_deleted: 0, events_deleted: 0 }
}

interface Response {
  data: unknown
  error: null
  status: number
  count: number | null
}

function createBuilder(table: string) {
  let rows = TABLES[table] ?? []
  let single = false
  let head = false
  let wantCount = false
  let inserted: Row | null = null
  let from = 0
  let to = Number.POSITIVE_INFINITY

  const text = (value: unknown): string => String(value ?? '').toLowerCase()

  const apply = (method: string, args: unknown[]): void => {
    switch (method) {
      case 'select': {
        const options = (args[1] ?? {}) as { count?: string; head?: boolean }
        wantCount = options.count === 'exact'
        head = options.head === true
        break
      }
      case 'eq':
        rows = rows.filter((r) => String(r[String(args[0])]) === String(args[1]))
        break
      case 'in':
        rows = rows.filter((r) => (args[1] as unknown[]).map(String).includes(String(r[String(args[0])])))
        break
      case 'ilike':
        rows = rows.filter((r) => text(r[String(args[0])]).includes(text(args[1]).replace(/%/g, '')))
        break
      case 'range':
        from = Number(args[0])
        to = Number(args[1])
        break
      case 'insert':
        inserted = { id: 'T099', ...(args[0] as Row) }
        break
      case 'single':
      case 'maybeSingle':
        single = true
        break
      default:
        break // order, limit, lt, gte, lte, or, update, delete: diabaikan di mode demo
    }
  }

  const result = (): Response => {
    const total = rows.length
    if (head) return { data: null, error: null, status: 200, count: total }
    const payload = single ? (inserted ?? rows[0] ?? null) : rows.slice(from, Number.isFinite(to) ? to + 1 : undefined)
    return { data: payload, error: null, status: 200, count: wantCount ? total : null }
  }

  const chain: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (value: Response) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve(result()).then(resolve, reject)
        }
        return (...args: unknown[]) => {
          apply(String(prop), args)
          return chain
        }
      }
    }
  )
  return chain
}

const resolved = (data: unknown) => Promise.resolve({ data, error: null, status: 200, count: null })

/** Klien palsu dengan bentuk yang sama dengan bagian SupabaseClient yang dipakai aplikasi. */
export function createDemoClient() {
  const user = { id: String(DEMO_ADMIN.id) }
  return {
    from: (table: string) => createBuilder(table),
    rpc: (name: string) => {
      const value = RPC[name]
      return resolved(typeof value === 'function' ? (value as () => unknown)() : (value ?? null))
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user } }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user }, error: null }),
      signUp: () => Promise.resolve({ data: { user: { id: `demo-${Date.now()}` } }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } })
    }
  }
}
