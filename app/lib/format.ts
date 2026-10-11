import type { NumericLike, SubscriptionStatus } from '~/models/types'

// Pemformat angka, uang, dan waktu (zona Asia/Jakarta) untuk seluruh dashboard.

const TZ = 'Asia/Jakarta'
const fRupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const fAngka = new Intl.NumberFormat('id-ID')
const fTanggalJam = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' })
const fTanggal = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, dateStyle: 'medium' })

type Maybe<T> = T | null | undefined

export const toNumber = (value: Maybe<NumericLike>): number => Number(value) || 0

export const formatRupiah = (value: Maybe<NumericLike>): string => fRupiah.format(toNumber(value))
export const formatNumber = (value: Maybe<NumericLike>): string => fAngka.format(toNumber(value))

function parseDate(value: Maybe<string>): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(value: Maybe<string>): string {
  const date = parseDate(value)
  return date ? fTanggalJam.format(date) : '-'
}

export function formatDate(value: Maybe<string>): string {
  const date = parseDate(value)
  return date ? fTanggal.format(date) : '-'
}

/** Label sisa masa langganan dari jumlah hari (boleh negatif). */
export function daysLabel(days: Maybe<NumericLike>): string {
  if (days === null || days === undefined || days === '') return 'tanpa langganan'
  const n = Number(days)
  if (!Number.isFinite(n)) return '-'
  if (n === 0) return 'berakhir hari ini'
  if (n > 0) return `sisa ${n} hari`
  return `lewat ${Math.abs(n)} hari`
}

export type Tone = '' | 'ok' | 'warn' | 'bad' | 'info'

/** Warna lencana untuk status langganan. */
export function subTone(status: Maybe<SubscriptionStatus>, days: Maybe<NumericLike>): Tone {
  const n = Number(days)
  if (status === 'berhenti') return 'bad'
  if (!Number.isFinite(n)) return 'bad'
  if (n < 0) return 'bad'
  if (status === 'jatuh_tempo' || n <= 14) return 'warn'
  if (status === 'trial') return 'info'
  return 'ok'
}

/** "3 menit lalu" untuk kolom waktu pada log. */
export function relTime(value: Maybe<string>, now: number = Date.now()): string {
  const date = parseDate(value)
  if (!date) return '-'
  const detik = Math.round((now - date.getTime()) / 1000)
  if (detik < 60) return 'baru saja'
  const menit = Math.round(detik / 60)
  if (menit < 60) return `${menit} menit lalu`
  const jam = Math.round(menit / 60)
  if (jam < 24) return `${jam} jam lalu`
  const hari = Math.round(jam / 24)
  if (hari < 30) return `${hari} hari lalu`
  return formatDate(value)
}

const MAX_NILAI = 220

function ringkasNilai(value: unknown): string {
  if (value === null || value === undefined) return '(kosong)'
  if (typeof value === 'object') {
    const teks = JSON.stringify(value)
    return teks.length > MAX_NILAI ? teks.slice(0, MAX_NILAI - 3) + '...' : teks
  }
  return String(value)
}

const isChange = (value: unknown): value is { dari?: unknown; jadi?: unknown } =>
  typeof value === 'object' && value !== null && ('dari' in value || 'jadi' in value)

/**
 * Ubah isi kolom `detail` audit menjadi teks yang bisa dibaca manusia:
 *   { qty: { dari: 10, jadi: 8 } }        -> "qty: 10 -> 8"
 *   { total: 25000, method: 'tunai' }     -> "total: 25000 | method: tunai"
 */
export function prettyDetail(detail: Maybe<Record<string, unknown>>): string {
  if (!detail || typeof detail !== 'object') return ''
  const bagian: string[] = []
  for (const [kunci, nilai] of Object.entries(detail)) {
    if (nilai === null || nilai === undefined) continue
    if (isChange(nilai)) bagian.push(`${kunci}: ${ringkasNilai(nilai.dari)} -> ${ringkasNilai(nilai.jadi)}`)
    else bagian.push(`${kunci}: ${ringkasNilai(nilai)}`)
  }
  return bagian.join(' | ')
}

export function initialOf(name: Maybe<string>): string {
  const teks = (name ?? '').trim()
  return teks ? teks.charAt(0).toUpperCase() : '?'
}
