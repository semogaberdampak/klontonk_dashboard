import { describe, expect, it } from 'vitest'
import { daysLabel, formatDate, formatDateTime, formatNumber, formatRupiah, initialOf, prettyDetail, relTime, subTone, toNumber } from './format'

describe('toNumber / formatNumber / formatRupiah', () => {
  it('menganggap null, undefined, dan teks bukan angka sebagai 0', () => {
    expect(toNumber(null)).toBe(0)
    expect(toNumber(undefined)).toBe(0)
    expect(toNumber('abc')).toBe(0)
  })

  it('membaca numeric yang tiba sebagai string', () => {
    expect(toNumber('1250.5')).toBe(1250.5)
    expect(formatNumber('1250')).toBe('1.250')
  })

  it('memformat rupiah tanpa pecahan', () => {
    expect(formatRupiah(45600)).toMatch(/45\.600/)
    expect(formatRupiah(null)).toMatch(/0/)
  })
})

describe('formatDate / formatDateTime', () => {
  it('mengembalikan "-" untuk nilai kosong atau tidak valid', () => {
    expect(formatDate(null)).toBe('-')
    expect(formatDate('bukan tanggal')).toBe('-')
    expect(formatDateTime('')).toBe('-')
  })

  it('memakai zona Asia/Jakarta', () => {
    // 2026-01-31 20:00 UTC = 2026-02-01 03:00 WIB
    expect(formatDate('2026-01-31T20:00:00Z')).toMatch(/1 Feb 2026/)
  })
})

describe('daysLabel', () => {
  it.each([
    [null, 'tanpa langganan'],
    ['', 'tanpa langganan'],
    [0, 'berakhir hari ini'],
    [5, 'sisa 5 hari'],
    [-3, 'lewat 3 hari'],
    ['x', '-']
  ])('daysLabel(%s) = %s', (input, expected) => {
    expect(daysLabel(input as number | string | null)).toBe(expected)
  })
})

describe('subTone', () => {
  it('bad untuk berhenti, sisa hari tak terbaca, atau sudah lewat', () => {
    expect(subTone('berhenti', 100)).toBe('bad')
    expect(subTone('aktif', undefined)).toBe('bad')
    expect(subTone('aktif', 'x')).toBe('bad')
    expect(subTone('aktif', -1)).toBe('bad')
  })

  it('perilaku bawaan: client tanpa langganan (null) dihitung 0 hari -> warn', () => {
    expect(subTone('aktif', null)).toBe('warn')
  })

  it('warn untuk jatuh tempo atau sisa <= 14 hari', () => {
    expect(subTone('jatuh_tempo', 100)).toBe('warn')
    expect(subTone('aktif', 14)).toBe('warn')
  })

  it('info untuk trial yang masih lama, ok untuk aktif yang masih lama', () => {
    expect(subTone('trial', 30)).toBe('info')
    expect(subTone('aktif', 30)).toBe('ok')
  })
})

describe('relTime', () => {
  const now = Date.parse('2026-05-10T12:00:00Z')

  it.each([
    ['2026-05-10T11:59:40Z', 'baru saja'],
    ['2026-05-10T11:57:00Z', '3 menit lalu'],
    ['2026-05-10T09:00:00Z', '3 jam lalu'],
    ['2026-05-07T12:00:00Z', '3 hari lalu']
  ])('%s -> %s', (value, expected) => {
    expect(relTime(value, now)).toBe(expected)
  })

  it('jatuh ke tanggal biasa setelah 30 hari', () => {
    expect(relTime('2026-01-01T00:00:00Z', now)).toMatch(/2026/)
  })

  it('mengembalikan "-" bila kosong', () => {
    expect(relTime(null, now)).toBe('-')
  })
})

describe('prettyDetail', () => {
  it('menampilkan perubahan nilai sebelum -> sesudah', () => {
    expect(prettyDetail({ qty: { dari: 10, jadi: 8 } })).toBe('qty: 10 -> 8')
  })

  it('menggabungkan beberapa kolom dan melewati yang kosong', () => {
    expect(prettyDetail({ total: 25000, method: 'tunai', note: null })).toBe('total: 25000 | method: tunai')
  })

  it('memotong nilai objek yang sangat panjang', () => {
    const hasil = prettyDetail({ data: { teks: 'x'.repeat(500) } })
    expect(hasil.endsWith('...')).toBe(true)
    expect(hasil.length).toBeLessThan(260)
  })

  it('kosong untuk null', () => {
    expect(prettyDetail(null)).toBe('')
  })
})

describe('initialOf', () => {
  it('mengambil huruf pertama kapital', () => {
    expect(initialOf('  budi')).toBe('B')
  })

  it('memakai "?" bila kosong', () => {
    expect(initialOf('')).toBe('?')
    expect(initialOf(null)).toBe('?')
  })
})
