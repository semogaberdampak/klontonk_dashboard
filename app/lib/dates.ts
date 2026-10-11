// Tanggal kalender dalam zona Asia/Jakarta (UTC+7, tanpa DST).

const JAKARTA_OFFSET = '+07:00'
const MS_PER_DAY = 86_400_000
const fIsoJakarta = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

/** "YYYY-MM-DD" hari ini di Jakarta, digeser `offsetHari` hari. */
export function tanggalJakarta(offsetHari = 0, now: number = Date.now()): string {
  return fIsoJakarta.format(new Date(now + offsetHari * MS_PER_DAY))
}

export const hariIni = (now: number = Date.now()): string => tanggalJakarta(0, now)

/** Tambah (atau kurangi) hari pada tanggal "YYYY-MM-DD". */
export function tambahHari(tanggal: string, jumlah: number): string {
  const date = new Date(`${tanggal}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + jumlah)
  return date.toISOString().slice(0, 10)
}

/** Batas hari (Jakarta) -> waktu ISO yang tepat. String kosong bila tanggal kosong. */
export function batasWaktu(tanggal: string, akhir = false): string {
  if (!tanggal) return ''
  const jam = akhir ? '23:59:59.999' : '00:00:00.000'
  return new Date(`${tanggal}T${jam}${JAKARTA_OFFSET}`).toISOString()
}
