import { supabase } from '~/models/supabase'
import { run, type Result } from '~/models/result'
import type { ClientStatus } from '~/models/types'

export interface NewClient {
  name: string
  planCode: string
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  trialDays: number
  note: string | null
}

export interface ClientPatch {
  name: string
  status: ClientStatus
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  note: string | null
}

/** Client + langganan trial dibuat dalam satu transaksi database (tidak mungkin setengah jadi). */
export function createClientWithPlan(input: NewClient): Promise<Result<unknown>> {
  return run<unknown>(
    supabase.rpc('create_client_with_plan', {
      p_name: input.name,
      p_plan_code: input.planCode,
      p_contact_name: input.contactName,
      p_contact_phone: input.contactPhone,
      p_contact_email: input.contactEmail,
      p_trial_days: input.trialDays,
      p_note: input.note
    }),
    null
  )
}

export function updateClient(id: string, patch: ClientPatch): Promise<Result<unknown>> {
  return run<unknown>(supabase.from('clients').update(patch).eq('id', id), null)
}

export function setClientStatus(id: string, status: ClientStatus): Promise<Result<unknown>> {
  return run<unknown>(supabase.from('clients').update({ status }).eq('id', id), null)
}
