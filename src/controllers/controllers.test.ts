import { describe, expect, it } from 'vitest'
import { alasanPerhatian, needsAttention } from './useRingkasanController'
import { parseAudit } from './useLogAuditController'
import { parsePemakaian, totalUsage } from './usePemakaianController'
import { parseRetur } from './useReturController'
import { parseTeknis } from './useLogTeknisController'
import { parseTransaksi } from './useTransaksiController'
import { summarize } from './useLanggananController'
import { toPlanInput } from './usePaketController'
import { validateNewAccount } from './usePenggunaController'
import { daysOrDefault } from './usePengaturanController'
import type { ClientOverview } from '@/models/types'

const NOW = Date.parse('2026-05-10T05:00:00Z') // 12:00 WIB

function overview(patch: Partial<ClientOverview>): ClientOverview {
  return {
    id: 'C0001', name: 'Warung', status: 'aktif', contact_name: null, contact_phone: null, contact_email: null, note: null,
    plan_code: 'basic', plan_name: 'Basic', price_month: 100000, sub_status: 'aktif', days_left: 90, expires_at: '2026-08-01',
    branch_count: 1, user_count: 2, trx_30d: 10, omzet_30d: 500000, logs_7d: 5, errors_7d: 0, ...patch
  }
}

describe('Ringkasan', () => {
  it('client sehat tidak perlu perhatian', () => {
    expect(needsAttention(overview({}))).toBe(false)
    expect(alasanPerhatian(overview({}))).toBe('-')
  })

  it.each([
    [{ status: 'suspend' as const }, 'client disuspend'],
    [{ sub_status: 'berhenti' as const }, 'langganan berhenti'],
    [{ days_left: null }, 'belum ada langganan'],
    [{ days_left: -2 }, 'langganan sudah berakhir'],
    [{ days_left: 7 }, 'langganan segera berakhir'],
    [{ errors_7d: 3 }, '3 error dalam 7 hari']
  ])('alasan untuk %o mengandung "%s"', (patch, alasan) => {
    const client = overview(patch)
    expect(needsAttention(client)).toBe(true)
    expect(alasanPerhatian(client)).toContain(alasan)
  })
})

describe('parameter URL -> filter', () => {
  it('Transaksi memakai 30 hari terakhir bila tanggal tidak ada di URL', () => {
    const f = parseTransaksi(new URLSearchParams(''), NOW)
    expect(f.sampai).toBe('2026-05-10')
    expect(f.dari).toBe('2026-04-10')
  })

  it('tanggal kosong EKSPLISIT berarti tanpa batas, bukan tanggal bawaan', () => {
    const f = parseTransaksi(new URLSearchParams('dari=&sampai='), NOW)
    expect(f.dari).toBe('')
    expect(f.sampai).toBe('')
  })

  it('metode tidak dikenal diabaikan', () => {
    expect(parseTransaksi(new URLSearchParams('metode=kripto'), NOW).metode).toBe('')
    expect(parseTransaksi(new URLSearchParams('metode=tunai'), NOW).metode).toBe('tunai')
  })

  it('Retur dan Log punya jendela bawaan masing-masing', () => {
    expect(parseRetur(new URLSearchParams(''), NOW).dari).toBe('2026-04-10')
    expect(parseAudit(new URLSearchParams(''), NOW).dari).toBe('2026-05-03')
    expect(parseTeknis(new URLSearchParams(''), NOW).dari).toBe('2026-05-03')
  })

  it('Retur memvalidasi jenis dan alasan', () => {
    const f = parseRetur(new URLSearchParams('jenis=supplier&alasan=bocor'), NOW)
    expect(f.jenis).toBe('supplier')
    expect(f.alasan).toBe('')
  })

  it('Log teknis memvalidasi level dan offset', () => {
    const f = parseTeknis(new URLSearchParams('level=warn&offset=-9'), NOW)
    expect(f.level).toBe('warn')
    expect(f.offset).toBe(0)
  })

  it('Pemakaian memakai 30 hari termasuk hari ini', () => {
    const f = parsePemakaian(new URLSearchParams('client=C0001'), NOW)
    expect(f).toEqual({ client: 'C0001', dari: '2026-04-11', sampai: '2026-05-10' })
  })
})

describe('totalUsage', () => {
  it('menjumlahkan kolom numeric yang tiba sebagai string', () => {
    const total = totalUsage([
      { day: '2026-05-01', trx_count: 2, trx_total: '10000', return_count: 1, return_amount: '500', log_count: 4, event_count: 0 },
      { day: '2026-05-02', trx_count: '3', trx_total: 5000, return_count: null, return_amount: null, log_count: 1, event_count: 2 }
    ])
    expect(total).toEqual({ trx: 5, omzet: 15000, retur: 1, nilaiRetur: 500, log: 5, error: 2 })
  })
})

describe('Langganan.summarize', () => {
  const baris = (patch: Partial<ReturnType<typeof summaryRow>>) => ({ ...summaryRow(), ...patch })
  function summaryRow() {
    return { id: 'C1', name: 'A', plan_code: 'basic', plan_name: 'Basic', price_month: 100000 as number | null, sub_status: 'aktif' as const, days_left: 60 as number | null, expires_at: '2026-07-01' }
  }

  it('menghitung potensi hanya dari langganan yang masih berlaku', () => {
    const hasil = summarize([
      baris({ id: 'C1', price_month: 100000 }),
      baris({ id: 'C2', price_month: 250000, sub_status: 'trial' as never }),
      baris({ id: 'C3', price_month: 999999, days_left: -4 })
    ])
    expect(hasil.berlaku.map((c) => c.id)).toEqual(['C1', 'C2'])
    expect(hasil.trial.map((c) => c.id)).toEqual(['C2'])
    expect(hasil.potensi).toBe(350000)
  })

  it('perlu perhatian: tanpa langganan, sudah lewat, <= 14 hari, atau berhenti', () => {
    const hasil = summarize([
      baris({ id: 'A', days_left: null }),
      baris({ id: 'B', days_left: -1 }),
      baris({ id: 'C', days_left: 14 }),
      baris({ id: 'D', sub_status: 'berhenti' as never }),
      baris({ id: 'E', days_left: 15 })
    ])
    expect(hasil.perhatian.map((c) => c.id)).toEqual(['A', 'B', 'C', 'D'])
  })
})

describe('Paket.toPlanInput', () => {
  it('mengubah isian teks menjadi angka dengan batas bawah aman', () => {
    expect(toPlanInput({ name: 'Basic', price_month: '', max_branches: '0', max_users: '5', is_active: true, note: '' })).toEqual({
      name: 'Basic', price_month: 0, max_branches: 1, max_users: 5, is_active: true, note: null
    })
  })
})

describe('Pengguna.validateNewAccount', () => {
  it.each([
    ['Budi', 'abc12345', 'T001', 'Username 3-24'],
    ['c0001.budi', 'abc12345', '', 'Pilih cabang'],
    ['c0001.budi', 'abc123', 'T001', 'minimal 8'],
    ['c0001.budi', 'abcdefghi', 'T001', 'huruf dan angka'],
    ['c0001.budi', 'xC0001.budi1', 'T001', 'tidak boleh mengandung username']
  ])('menolak (%s, %s, %s)', (username, password, tenant, pesan) => {
    expect(validateNewAccount(username, password, tenant)).toContain(pesan)
  })

  it('menerima isian yang benar', () => {
    expect(validateNewAccount('c0001.budi', 'rahasia123', 'T001')).toBeNull()
  })
})

describe('Pengaturan.daysOrDefault', () => {
  it('kembali ke nilai bawaan bila kosong, nol, atau bukan angka', () => {
    expect(daysOrDefault('', 180)).toBe(180)
    expect(daysOrDefault('0', 180)).toBe(180)
    expect(daysOrDefault('abc', 60)).toBe(60)
    expect(daysOrDefault('90', 180)).toBe(90)
  })
})
