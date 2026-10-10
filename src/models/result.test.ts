import { describe, expect, it } from 'vitest'
import { fail, isReferenceConflict, ok, pesanError, run, runCount, runPage, toAppError } from './result'

describe('toAppError', () => {
  it('menandai 401 sebagai sesi berakhir', () => {
    expect(toAppError({ message: 'JWT expired', code: 'PGRST301' }, 401).expired).toBe(true)
    expect(toAppError({ message: 'x' }, 500).expired).toBe(false)
  })

  it('mengenali kegagalan jaringan sebagai status 0', () => {
    const error = toAppError({ message: 'TypeError: Failed to fetch' }, 0)
    expect(error.status).toBe(0)
    expect(error.code).toBe('network')
  })

  it('membaca status dari error Auth bila tidak diberikan terpisah', () => {
    expect(toAppError({ message: 'Invalid login', status: 400 }).status).toBe(400)
  })

  it('memberi pesan bawaan untuk objek kosong', () => {
    expect(toAppError(null, 503).message).toContain('503')
  })
})

describe('pesanError', () => {
  const base = { status: 400, code: '', message: 'pesan server', expired: false }

  it.each([
    [{ ...base, expired: true, status: 401 }, 'Sesi berakhir. Silakan login ulang.'],
    [{ ...base, code: '23505' }, 'Data dengan kunci yang sama sudah ada.'],
    [{ ...base, code: '23503' }, 'Masih terhubung dengan data lain, jadi tidak bisa diubah atau dihapus.'],
    [{ ...base, code: '23514' }, 'Nilai yang dimasukkan tidak memenuhi aturan database.'],
    [{ ...base, status: 403 }, 'Tidak punya hak untuk tindakan ini.'],
    [{ ...base, code: '42501' }, 'Tidak punya hak untuk tindakan ini.'],
    [base, 'pesan server']
  ])('memetakan %o', (error, expected) => {
    expect(pesanError(error)).toBe(expected)
  })

  it('aman untuk error kosong', () => {
    expect(pesanError(null)).toBe('Gagal. Coba lagi.')
  })

  it('memakai pesan jaringan saat status 0', () => {
    expect(pesanError({ status: 0, code: 'network', message: 'Server tidak terjangkau.', expired: false })).toBe('Server tidak terjangkau.')
  })
})

describe('isReferenceConflict', () => {
  it('true untuk kode 23503 atau status 409', () => {
    expect(isReferenceConflict({ status: 409, code: '', message: '', expired: false })).toBe(true)
    expect(isReferenceConflict({ status: 400, code: '23503', message: '', expired: false })).toBe(true)
    expect(isReferenceConflict({ status: 400, code: '', message: '', expired: false })).toBe(false)
  })
})

describe('run', () => {
  it('membungkus data sukses', async () => {
    expect(await run(Promise.resolve({ data: [1, 2], error: null }), [] as number[])).toEqual(ok([1, 2]))
  })

  it('memakai nilai cadangan bila data null', async () => {
    expect(await run(Promise.resolve({ data: null, error: null }), [] as number[])).toEqual(ok([]))
  })

  it('mengubah error Supabase menjadi Result gagal', async () => {
    const hasil = await run(Promise.resolve({ data: null, error: { message: 'duplikat', code: '23505' }, status: 409 }), null)
    expect(hasil).toEqual(fail({ status: 409, code: '23505', message: 'duplikat', expired: false }))
  })

  it('tidak pernah melempar: exception menjadi Result gagal', async () => {
    const hasil = await run(Promise.reject(new TypeError('Failed to fetch')), null)
    expect(hasil.ok).toBe(false)
    if (!hasil.ok) expect(hasil.error.status).toBe(0)
  })
})

describe('runPage', () => {
  it('membawa total dari count', async () => {
    const hasil = await runPage<number>(Promise.resolve({ data: [1, 2], error: null, count: 120 }))
    expect(hasil).toEqual(ok({ rows: [1, 2], total: 120 }))
  })

  it('memakai jumlah baris bila count tidak ada, dan [] bila data bukan array', async () => {
    expect(await runPage<number>(Promise.resolve({ data: [7], error: null }))).toEqual(ok({ rows: [7], total: 1 }))
    expect(await runPage<number>(Promise.resolve({ data: null, error: null }))).toEqual(ok({ rows: [], total: 0 }))
  })

  it('meneruskan error', async () => {
    const hasil = await runPage<number>(Promise.resolve({ data: null, error: { message: 'x' }, status: 401 }))
    expect(hasil.ok).toBe(false)
    if (!hasil.ok) expect(hasil.error.expired).toBe(true)
  })
})

describe('runCount', () => {
  it('mengembalikan jumlah, atau null bila gagal', async () => {
    expect(await runCount(Promise.resolve({ data: null, error: null, count: 5 }))).toBe(5)
    expect(await runCount(Promise.resolve({ data: null, error: { message: 'x' }, count: null }))).toBeNull()
    expect(await runCount(Promise.reject(new Error('putus')))).toBeNull()
  })
})
