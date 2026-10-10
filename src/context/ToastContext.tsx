import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

export type ToastType = 'info' | 'success' | 'warning' | 'danger'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  hiding: boolean
}

interface ToastOptions {
  type?: ToastType
  duration?: number
}

export type ToastFn = (message: string, options?: ToastOptions) => void

const ToastContext = createContext<ToastFn | null>(null)

const DEFAULT_DURATION_MS = 3500
const HIDE_ANIMATION_MS = 250
const MARKS: Record<ToastType, string> = { info: 'i', success: 'v', warning: '!', danger: 'x' }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const toast = useCallback<ToastFn>((message, { type = 'info', duration = DEFAULT_DURATION_MS } = {}) => {
    const id = nextId.current++
    setItems((current) => [...current, { id, message, type, hiding: false }])
    setTimeout(() => {
      setItems((current) => current.map((t) => (t.id === id ? { ...t, hiding: true } : t)))
      setTimeout(() => setItems((current) => current.filter((t) => t.id !== id)), HIDE_ANIMATION_MS)
    }, duration)
  }, [])

  const value = useMemo(() => toast, [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-root" aria-live="polite" aria-atomic="true">
        {items.map((item) => (
          <div key={item.id} className={`toast ${item.type}${item.hiding ? ' hiding' : ''}`} role="status">
            <span style={{ fontWeight: 700 }}>{MARKS[item.type]}</span>
            <span style={{ flex: 1 }}>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastFn {
  const toast = useContext(ToastContext)
  if (!toast) throw new Error('useToast harus dipakai di dalam <ToastProvider>.')
  return toast
}
