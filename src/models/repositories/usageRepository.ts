import { supabase } from '@/models/supabase'
import { run, type Result } from '@/models/result'
import type { UsageDay } from '@/models/types'

/** Aktivitas harian satu client. Dihitung DATABASE lewat RPC usage_daily(). */
export function dailyUsage(clientId: string, from: string, to: string): Promise<Result<UsageDay[]>> {
  return run<UsageDay[]>(supabase.rpc('usage_daily', { p_client: clientId, p_from: from, p_to: to }), [])
}
