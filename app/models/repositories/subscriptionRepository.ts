import { supabase } from '~/models/supabase'
import { run, runPage, type Result } from '~/models/result'
import type { ClientOverview, PageResult, Subscription, SubscriptionStatus } from '~/models/types'

const COLUMNS =
  'id,client_id,plan_code,started_at,expires_at,status,note,client:clients(name,status),plan:plans(name,price_month)'

export interface SubscriptionFilters {
  client: string
  status: SubscriptionStatus | ''
  offset: number
}

export type SubscriptionSummary = Pick<
  ClientOverview,
  'id' | 'name' | 'plan_code' | 'plan_name' | 'price_month' | 'sub_status' | 'days_left' | 'expires_at'
>

export function pageSubscriptions(filters: SubscriptionFilters, limit: number): Promise<Result<PageResult<Subscription>>> {
  let query = supabase.from('subscriptions').select(COLUMNS, { count: 'exact' }).order('expires_at', { ascending: false })
  if (filters.client) query = query.eq('client_id', filters.client)
  if (filters.status) query = query.eq('status', filters.status)
  return runPage<Subscription>(query.range(filters.offset, filters.offset + limit - 1))
}

export function listSubscriptionSummary(): Promise<Result<SubscriptionSummary[]>> {
  return run<SubscriptionSummary[]>(
    supabase
      .from('v_client_overview')
      .select('id,name,plan_code,plan_name,price_month,sub_status,days_left,expires_at')
      .order('name'),
    []
  )
}

export interface NewSubscription {
  clientId: string
  planCode: string
  startedAt: string
  expiresAt: string
  status: SubscriptionStatus
  note: string | null
}

export function createSubscription(input: NewSubscription): Promise<Result<unknown>> {
  return run<unknown>(
    supabase.from('subscriptions').insert({
      client_id: input.clientId,
      plan_code: input.planCode,
      started_at: input.startedAt,
      expires_at: input.expiresAt,
      status: input.status,
      note: input.note
    }),
    null
  )
}

export interface SubscriptionPatch {
  plan_code: string
  status: SubscriptionStatus
  expires_at: string
  note: string | null
}

export function updateSubscription(id: Subscription['id'], patch: SubscriptionPatch): Promise<Result<unknown>> {
  return run<unknown>(supabase.from('subscriptions').update(patch).eq('id', id), null)
}

export function extendSubscription(id: Subscription['id'], expiresAt: string): Promise<Result<unknown>> {
  return run<unknown>(supabase.from('subscriptions').update({ expires_at: expiresAt, status: 'aktif' }).eq('id', id), null)
}

/** Tandai langganan trial/aktif yang sudah lewat masa berlakunya sebagai jatuh tempo. Hasil: jumlah baris. */
export async function markExpired(today: string): Promise<Result<number>> {
  const result = await run<{ id: Subscription['id'] }[]>(
    supabase.from('subscriptions').update({ status: 'jatuh_tempo' }).lt('expires_at', today).in('status', ['trial', 'aktif']).select('id'),
    []
  )
  return result.ok ? { ok: true, data: result.data.length } : result
}

export function deleteSubscription(id: Subscription['id']): Promise<Result<unknown>> {
  return run<unknown>(supabase.from('subscriptions').delete().eq('id', id), null)
}
