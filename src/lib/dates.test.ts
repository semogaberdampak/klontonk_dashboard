import { describe, expect, it } from 'vitest'
import { batasWaktu, hariIni, tambahHari, tanggalJakarta } from './dates'

describe('tanggalJakarta', () => {
  // 2026-03-01 18:00 UTC = 2026-03-02 01:00 WIB
  const now = Date.parse('2026-03-01T18:00:00Z')

  it('memakai tanggal kalender Jakarta, bukan UTC', () => {
    expect(hariIni(now)).toBe('2026-03-02')
  })

  it('menggeser hari mundur dan maju', () => {
    expect(tanggalJakarta(-30, now)).toBe('2026-01-31')
    expect(tanggalJakarta(1, now)).toBe('2026-03-03')
  })
})

describe('tambahHari', () => {
  it('melewati batas bulan dan tahun', () => {
    expect(tambahHari('2026-01-31', 30)).toBe('2026-03-02')
    expect(tambahHari('2025-12-31', 1)).toBe('2026-01-01')
  })

  it('bisa mengurangi hari', () => {
    expect(tambahHari('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('batasWaktu', () => {
  it('awal hari Jakarta = 17:00 UTC hari sebelumnya', () => {
    expect(batasWaktu('2026-03-02')).toBe('2026-03-01T17:00:00.000Z')
  })

  it('akhir hari Jakarta = 16:59:59.999 UTC', () => {
    expect(batasWaktu('2026-03-02', true)).toBe('2026-03-02T16:59:59.999Z')
  })

  it('kosong bila tanggal kosong', () => {
    expect(batasWaktu('')).toBe('')
  })
})
