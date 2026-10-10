import { supabase } from '@/models/supabase'
import { run, runPage, type Result } from '@/models/result'
import type { PageResult, Profile, UserRole } from '@/models/types'

const COLUMNS = 'id,username,name,role,avatar,tenant_id,created_at'

export interface ProfileFilters {
  /** undefined = semua cabang; daftar kosong = client belum punya cabang (hasil kosong). */
  tenantIds: string[] | undefined
  cari: string
  offset: number
}

export function pageProfiles(filters: ProfileFilters, limit: number): Promise<Result<PageResult<Profile>>> {
  let query = supabase.from('profiles').select(COLUMNS, { count: 'exact' }).order('created_at', { ascending: false })
  if (filters.tenantIds) query = query.in('tenant_id', filters.tenantIds)
  if (filters.cari) query = query.or(`username.ilike.*${filters.cari}*,name.ilike.*${filters.cari}*`)
  return runPage<Profile>(query.range(filters.offset, filters.offset + limit - 1))
}

export async function isUsernameTaken(username: string): Promise<Result<boolean>> {
  const result = await run<{ id: string }[]>(supabase.from('profiles').select('id').eq('username', username).limit(1), [])
  return result.ok ? { ok: true, data: result.data.length > 0 } : result
}

export interface NewProfile {
  id: string
  username: string
  name: string
  role: UserRole
  avatar: string
  tenantId: string
}

export function createProfile(input: NewProfile): Promise<Result<unknown>> {
  return run<unknown>(
    supabase.from('profiles').insert({
      id: input.id,
      username: input.username,
      name: input.name,
      role: input.role,
      avatar: input.avatar,
      tenant_id: input.tenantId
    }),
    null
  )
}

export function updateProfile(id: string, patch: { name: string; role: UserRole; tenant_id: string }): Promise<Result<unknown>> {
  return run<unknown>(supabase.from('profiles').update(patch).eq('id', id), null)
}

export function deleteUserByUsername(username: string): Promise<Result<unknown>> {
  return run<unknown>(supabase.rpc('platform_delete_user', { p_username: username }), null)
}
