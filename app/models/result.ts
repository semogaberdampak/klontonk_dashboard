// Semua akses data mengembalikan Result<T> dan TIDAK PERNAH melempar error: pemanggil
// (controller) cukup memeriksa `ok`. status 0 = tidak ada jaringan / server tidak menjawab.

export interface AppError {
  status: number
  code: string
  message: string
  /** true bila sesi login sudah tidak berlaku (HTTP 401). */
  expired: boolean
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError }

export const ok = <T>(data: T): Result<T> => ({ ok: true, data })

export const fail = (error: AppError): Result<never> => ({ ok: false, error })

const NETWORK_MESSAGE = 'Server tidak terjangkau. Periksa koneksi lalu coba lagi.'

export const networkError = (): AppError => ({ status: 0, code: 'network', message: NETWORK_MESSAGE, expired: false })

interface ErrorLike {
  message?: string
  code?: string | number
  status?: number
}

/** Ubah error Supabase (PostgREST / Auth) atau exception biasa menjadi AppError. */
export function toAppError(raw: unknown, httpStatus?: number): AppError {
  const source: ErrorLike = typeof raw === 'object' && raw !== null ? (raw as ErrorLike) : {}
  const status = httpStatus ?? (typeof source.status === 'number' ? source.status : 0)
  const code = source.code === undefined || source.code === null ? '' : String(source.code)
  const message = source.message || (status ? `Permintaan gagal (kode ${status}).` : NETWORK_MESSAGE)

  if (status === 0 && /fetch|network|timeout|abort/i.test(message)) return networkError()
  return { status, code, message, expired: status === 401 }
}

// Batas tipe tunggal antara jawaban Supabase dan model aplikasi. Klien Supabase di sini tidak
// bertipe skema (belum ada `supabase gen types`), dan parser select-nya menebak relasi embedded
// sebagai array padahal PostgREST mengirim objek untuk relasi many-to-one. Karena itu `data`
// diterima sebagai `unknown` dan dipersempit ke tipe model T HANYA di sini.
interface SupabaseResponse {
  data: unknown
  error: unknown
  status?: number
  count?: number | null
}

/** Jalankan satu permintaan Supabase dan kembalikan Result. */
export async function run<T>(operation: PromiseLike<SupabaseResponse>, fallback: T): Promise<Result<T>> {
  try {
    const response = await operation
    if (response.error) return fail(toAppError(response.error, response.status))
    return ok((response.data ?? fallback) as T)
  } catch (error: unknown) {
    return fail(toAppError(error))
  }
}

/** Seperti run(), tetapi untuk halaman bertotal (count: 'exact'). */
export async function runPage<T>(operation: PromiseLike<SupabaseResponse>): Promise<Result<{ rows: T[]; total: number }>> {
  try {
    const response = await operation
    if (response.error) return fail(toAppError(response.error, response.status))
    const rows = (Array.isArray(response.data) ? response.data : []) as T[]
    const total = typeof response.count === 'number' ? response.count : rows.length
    return ok({ rows, total })
  } catch (error: unknown) {
    return fail(toAppError(error))
  }
}

/** Hitung baris saja (head request) -- null bila gagal dibaca. */
export async function runCount(operation: PromiseLike<SupabaseResponse>): Promise<number | null> {
  try {
    const response = await operation
    return response.error || typeof response.count !== 'number' ? null : response.count
  } catch {
    return null
  }
}

// Pesan siap tampil untuk kesalahan yang paling sering muncul.
export function pesanError(error: AppError | null | undefined): string {
  if (!error) return 'Gagal. Coba lagi.'
  if (error.expired) return 'Sesi berakhir. Silakan login ulang.'
  if (error.code === '23505') return 'Data dengan kunci yang sama sudah ada.'
  if (error.code === '23503') return 'Masih terhubung dengan data lain, jadi tidak bisa diubah atau dihapus.'
  if (error.code === '23514') return 'Nilai yang dimasukkan tidak memenuhi aturan database.'
  if (error.status === 403 || error.code === '42501') return 'Tidak punya hak untuk tindakan ini.'
  if (error.status === 0) return error.message || 'Server tidak terjangkau. Periksa koneksi.'
  return error.message || 'Gagal menyimpan. Coba lagi.'
}

/** Kegagalan karena data masih dipakai tabel lain (FK) -- status 409 atau kode 23503. */
export const isReferenceConflict = (error: AppError): boolean => error.code === '23503' || error.status === 409
