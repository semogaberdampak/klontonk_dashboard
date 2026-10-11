import type { WatchSource } from 'vue'
import { pesanError, type Result } from '~/models/result'

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

/**
 * Muat data halaman. Dimuat ulang saat `deps` berubah atau tombol "Muat ulang" ditekan.
 * Jawaban basi (navigasi lain sudah berjalan) dibuang, dan sesi berakhir (401) otomatis
 * mengembalikan pengguna ke halaman login.
 */
export function useResource<T>(loader: () => Promise<Result<T>>, deps: WatchSource[] = []) {
  const { version } = useReload()
  const { expire } = useAuth()
  const state = shallowRef<ResourceState<T>>({ status: 'loading' })
  let token = 0

  const load = async (): Promise<void> => {
    const mine = ++token
    state.value = { status: 'loading' }
    const result = await loader()
    if (mine !== token) return
    if (result.ok) {
      state.value = { status: 'ready', data: result.data }
      return
    }
    if (result.error.expired) expire()
    state.value = { status: 'error', message: pesanError(result.error) }
  }

  watch([version, ...deps], load, { immediate: true })
  onScopeDispose(() => {
    token += 1
  })

  return state
}
