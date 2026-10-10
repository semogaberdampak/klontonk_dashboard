import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthValue } from '@/context/AuthContext'
import { ReloadProvider, useReload } from '@/context/ReloadContext'
import { fail, ok, type Result } from '@/models/result'
import { useResource } from './useResource'

function setup(expire = vi.fn()) {
  const auth: AuthValue = {
    status: 'authenticated',
    admin: null,
    login: vi.fn(),
    logout: vi.fn(),
    expire
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={auth}>
      <ReloadProvider>{children}</ReloadProvider>
    </AuthContext.Provider>
  )
  return { wrapper, expire }
}

describe('useResource', () => {
  it('mulai dari loading lalu ready dengan data', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useResource(async () => ok('halo'), []), { wrapper })
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', data: 'halo' }))
  })

  it('menampilkan pesan error yang ramah', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(
      () => useResource(async () => fail({ status: 400, code: '23505', message: 'x', expired: false }), []),
      { wrapper }
    )
    await waitFor(() => expect(result.current).toEqual({ status: 'error', message: 'Data dengan kunci yang sama sudah ada.' }))
  })

  it('memanggil expire() saat sesi berakhir (401)', async () => {
    const { wrapper, expire } = setup()
    renderHook(() => useResource(async () => fail({ status: 401, code: '', message: 'JWT expired', expired: true }), []), { wrapper })
    await waitFor(() => expect(expire).toHaveBeenCalledTimes(1))
  })

  it('memuat ulang saat dependensi berubah dan membuang jawaban basi', async () => {
    const { wrapper } = setup()
    const resolvers: Array<(nilai: string) => void> = []
    const loader = (kunci: string) => () =>
      new Promise<Result<string>>((resolve) => {
        resolvers.push((nilai) => resolve(ok(`${kunci}:${nilai}`)))
      })

    const { result, rerender } = renderHook(({ kunci }) => useResource(loader(kunci), [kunci]), { wrapper, initialProps: { kunci: 'a' } })
    rerender({ kunci: 'b' })
    await waitFor(() => expect(resolvers).toHaveLength(2))

    // Jawaban permintaan lama (a) tiba SETELAH permintaan baru (b) dimulai: harus diabaikan.
    await act(async () => resolvers[0]?.('lama'))
    expect(result.current.status).toBe('loading')
    await act(async () => resolvers[1]?.('baru'))
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', data: 'b:baru' }))
  })

  it('memuat ulang saat reload() dipanggil', async () => {
    const { wrapper } = setup()
    let hitungan = 0
    const { result } = renderHook(
      () => {
        const reload = useReload()
        const state = useResource(async () => ok(++hitungan), [])
        return { state, reload }
      },
      { wrapper }
    )
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', data: 1 }))
    act(() => result.current.reload.reload())
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', data: 2 }))
  })
})
