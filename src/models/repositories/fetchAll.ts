import { supabase } from '@/models/supabase'
import { fail, ok, toAppError, type Result } from '@/models/result'

const CHUNK = 500

/** Ambil seluruh baris (hanya untuk daftar acuan kecil: clients, plans, tenants). */
export async function fetchAll<T>(table: string, columns: string, orderBy: string): Promise<Result<T[]>> {
  const rows: T[] = []
  try {
    for (let from = 0; ; from += CHUNK) {
      const { data, error, status } = await supabase
        .from(table)
        .select(columns)
        .order(orderBy)
        .range(from, from + CHUNK - 1)
      if (error) return fail(toAppError(error, status))
      const chunk = (data ?? []) as T[]
      rows.push(...chunk)
      if (chunk.length < CHUNK) return ok(rows)
    }
  } catch (error: unknown) {
    return fail(toAppError(error))
  }
}
