// Bentuk data yang dikirim PostgREST. Kolom numeric bisa tiba sebagai string, jadi semua
// angka bertipe NumericLike dan WAJIB lewat Number()/formatNumber() sebelum dihitung.

export type NumericLike = number | string | null

export type ClientStatus = 'aktif' | 'suspend' | 'berhenti'
export type SubscriptionStatus = 'trial' | 'aktif' | 'jatuh_tempo' | 'berhenti'
export type UserRole = 'admin' | 'cashier'
export type PaymentMethod = 'tunai' | 'nontunai'
export type ReturnKind = 'pelanggan' | 'supplier'
export type ReturnReason = 'rusak' | 'kedaluwarsa' | 'salah_barang' | 'tidak_sesuai' | 'lainnya'
export type EventLevel = 'error' | 'warn' | 'info'

export interface PlatformAdmin {
  id: string
  name: string
  email: string | null
}

export interface ClientRef {
  id: string
  name: string
  status: ClientStatus
}

export interface Client extends ClientRef {
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  note: string | null
}

export interface Plan {
  code: string
  name: string
  price_month: NumericLike
  max_branches: number
  max_users: number
  is_active: boolean
  note: string | null
}

export interface Tenant {
  id: string
  name: string
  client_id: string
}

/** Baris view v_client_overview: angka agregat dihitung database. */
export interface ClientOverview extends Client {
  plan_code: string | null
  plan_name: string | null
  price_month: NumericLike
  sub_status: SubscriptionStatus | null
  days_left: NumericLike
  expires_at: string | null
  branch_count: NumericLike
  user_count: NumericLike
  trx_30d: NumericLike
  omzet_30d: NumericLike
  logs_7d: NumericLike
  errors_7d: NumericLike
}

export interface Subscription {
  id: number | string
  client_id: string
  plan_code: string
  started_at: string
  expires_at: string
  status: SubscriptionStatus
  note: string | null
  client: { name: string; status: ClientStatus } | null
  plan: { name: string; price_month: NumericLike } | null
}

export interface Profile {
  id: string
  username: string
  name: string
  role: UserRole
  avatar: string | null
  tenant_id: string
  created_at: string
}

export interface AuditLog {
  at: string
  actor_name: string | null
  actor_role: string | null
  action: string
  entity: string
  entity_id: string | null
  client_id: string | null
  tenant_id: string | null
  detail: Record<string, unknown> | null
}

export interface ClientEvent {
  at: string
  level: EventLevel
  source: string
  message: string
  context: Record<string, unknown> | null
  app_version: string | null
  device: string | null
  client_id: string | null
  tenant_id: string | null
}

export interface Sale {
  tenant_id: string
  no: string
  at: string
  cashier: string
  method: PaymentMethod
  total: NumericLike
  paid: NumericLike
  tenant: { name: string; client_id: string } | null
}

export interface StockReturn {
  tenant_id: string
  no: string
  at: string
  cashier: string
  kind: ReturnKind
  item_id: string
  name: string
  unit: string
  qty: NumericLike
  amount: NumericLike
  reason: ReturnReason
  note: string | null
  tenant: { name: string; client_id: string } | null
}

export interface UsageDay {
  day: string
  trx_count: NumericLike
  trx_total: NumericLike
  return_count: NumericLike
  return_amount: NumericLike
  log_count: NumericLike
  event_count: NumericLike
}

export interface PurgeSummary {
  audit_deleted: NumericLike
  events_deleted: NumericLike
}

export interface SystemCounts {
  klien: number | null
  cabang: number | null
  pengguna: number | null
  logAudit: number | null
  logTeknis: number | null
}

export interface PageResult<T> {
  rows: T[]
  total: number
}
