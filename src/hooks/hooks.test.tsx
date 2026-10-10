import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useConnection } from './useConnection'
import { useDraft } from './useDraft'
import { useGo } from './useGo'
import { oneOf, useUrlFilters } from './useUrlFilters'

const router = (initial: string) => ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>

describe('oneOf', () => {
  it('hanya menerima nilai yang diizinkan', () => {
    expect(oneOf('aktif', ['aktif', 'suspend'] as const)).toBe('aktif')
    expect(oneOf('hacker', ['aktif', 'suspend'] as const)).toBe('')
    expect(oneOf(null, ['aktif'] as const)).toBe('')
  })
})

describe('useUrlFilters', () => {
  it('mem-parse parameter URL dan memperbarui key saat URL berubah', () => {
    const { result } = renderHook(
      () => {
        const { filters, key } = useUrlFilters((p) => ({ cari: p.get('cari') ?? '' }))
        const go = useGo()
        return { filters, key, go }
      },
      { wrapper: router('/klien?cari=warung') }
    )
    expect(result.current.filters).toEqual({ cari: 'warung' })
    act(() => result.current.go('/klien', { cari: 'toko' }))
    expect(result.current.filters).toEqual({ cari: 'toko' })
    expect(result.current.key).toBe('cari=toko')
  })
})

describe('useGo', () => {
  it('mempertahankan parameter kosong dan membuang undefined', () => {
    const { result } = renderHook(
      () => ({ go: useGo(), location: useLocation() }),
      { wrapper: router('/') }
    )
    act(() => result.current.go('/transaksi', { dari: '', sampai: '', cari: undefined, offset: 50 }))
    expect(result.current.location.pathname).toBe('/transaksi')
    expect(result.current.location.search).toBe('?dari=&sampai=&offset=50')
  })

  it('tanpa parameter menghasilkan URL bersih', () => {
    const { result } = renderHook(() => ({ go: useGo(), location: useLocation() }), { wrapper: router('/klien?cari=x') })
    act(() => result.current.go('/klien'))
    expect(result.current.location.search).toBe('')
  })
})

describe('useDraft', () => {
  it('menyimpan ketikan tanpa mengubah sumber, lalu pulih saat sumber berubah', () => {
    const { result, rerender } = renderHook(({ source }) => useDraft(source), { initialProps: { source: { cari: 'a' } } })
    act(() => result.current[1]('cari', 'ketikan'))
    expect(result.current[0].cari).toBe('ketikan')
    rerender({ source: { cari: 'b' } })
    expect(result.current[0].cari).toBe('b')
  })

  it('tidak mereset saat sumber sama isinya (objek baru, nilai sama)', () => {
    const { result, rerender } = renderHook(({ source }) => useDraft(source), { initialProps: { source: { cari: 'a' } } })
    act(() => result.current[1]('cari', 'ketikan'))
    rerender({ source: { cari: 'a' } })
    expect(result.current[0].cari).toBe('ketikan')
  })
})

describe('useConnection', () => {
  it('ok bila server menjawab, bad bila gagal, dan bad saat offline', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('putus'))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useConnection())
    await waitFor(() => expect(result.current.state).toBe('ok'))
    expect(result.current.text).toMatch(/Tersambung/)

    act(() => window.dispatchEvent(new Event('online')))
    await waitFor(() => expect(result.current.state).toBe('bad'))
    expect(result.current.text).toBe('Supabase tidak terjangkau')

    act(() => window.dispatchEvent(new Event('offline')))
    expect(result.current.text).toBe('Tidak ada koneksi')
    vi.unstubAllGlobals()
  })
})
