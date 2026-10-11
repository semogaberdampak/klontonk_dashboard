import { supabase } from '~/models/supabase'
import { run, type Result } from '~/models/result'
import type { Plan } from '~/models/types'

export interface PlanInput {
  name: string
  price_month: number
  max_branches: number
  max_users: number
  is_active: boolean
  note: string | null
}

export function listPlans(): Promise<Result<Plan[]>> {
  return run<Plan[]>(supabase.from('plans').select('*').order('code'), [])
}

export function createPlan(code: string, input: PlanInput): Promise<Result<unknown>> {
  return run<unknown>(supabase.from('plans').insert({ code, ...input }), null)
}

export function updatePlan(code: string, input: PlanInput): Promise<Result<unknown>> {
  return run<unknown>(supabase.from('plans').update(input).eq('code', code), null)
}

export function setPlanActive(code: string, isActive: boolean): Promise<Result<unknown>> {
  return run<unknown>(supabase.from('plans').update({ is_active: isActive }).eq('code', code), null)
}

export function deletePlan(code: string): Promise<Result<unknown>> {
  return run<unknown>(supabase.from('plans').delete().eq('code', code), null)
}
