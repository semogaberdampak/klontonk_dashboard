export type ToastType = 'info' | 'success' | 'warning' | 'danger'

export interface ToastItem {
  id: number
  message: string
  type: ToastType
  hiding: boolean
}

export interface ToastOptions {
  type?: ToastType
  duration?: number
}

const DEFAULT_DURATION_MS = 3500
const HIDE_ANIMATION_MS = 250
let nextId = 1

/** Notifikasi singkat. Daftarnya dirender oleh <ToastHost> di app.vue. */
export function useToast() {
  const items = useState<ToastItem[]>('toasts', () => [])

  const toast = (message: string, { type = 'info', duration = DEFAULT_DURATION_MS }: ToastOptions = {}): void => {
    const id = nextId++
    items.value = [...items.value, { id, message, type, hiding: false }]
    setTimeout(() => {
      items.value = items.value.map((t) => (t.id === id ? { ...t, hiding: true } : t))
      setTimeout(() => {
        items.value = items.value.filter((t) => t.id !== id)
      }, HIDE_ANIMATION_MS)
    }, duration)
  }

  return { items, toast }
}
