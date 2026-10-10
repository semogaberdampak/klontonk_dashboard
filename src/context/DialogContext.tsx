import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ConfirmModal } from '@/components/ConfirmModal'
import { FormModal } from '@/components/FormModal'
import type { ConfirmOptions, FormSpec } from '@/components/formTypes'

type ActiveDialog =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'form'; spec: FormSpec; resolve: (value: boolean) => void }

export interface DialogApi {
  /** Dialog konfirmasi. Resolve true bila pengguna menekan tombol utama. */
  confirm: (options: ConfirmOptions) => Promise<boolean>
  /** Pemberitahuan satu tombol. */
  notify: (options: Omit<ConfirmOptions, 'cancelText'>) => Promise<void>
  confirmDelete: (title: string, message: string) => Promise<boolean>
  /** Form-modal generik. Resolve true bila berhasil disimpan. */
  openForm: (spec: FormSpec) => Promise<boolean>
}

const DialogContext = createContext<DialogApi | null>(null)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDialog | null>(null)

  const confirm = useCallback<DialogApi['confirm']>(
    (options) => new Promise<boolean>((resolve) => setActive({ kind: 'confirm', options, resolve })),
    []
  )

  const openForm = useCallback<DialogApi['openForm']>(
    (spec) => new Promise<boolean>((resolve) => setActive({ kind: 'form', spec, resolve })),
    []
  )

  const api = useMemo<DialogApi>(
    () => ({
      confirm,
      openForm,
      notify: async (options) => {
        await confirm({ ...options, cancelText: null })
      },
      confirmDelete: (title, message) =>
        confirm({ title, message, confirmText: 'Ya, Hapus', cancelText: 'Batal', variant: 'danger' })
    }),
    [confirm, openForm]
  )

  const close = useCallback(
    (value: boolean) => {
      active?.resolve(value)
      setActive(null)
    },
    [active]
  )

  return (
    <DialogContext.Provider value={api}>
      {children}
      {active?.kind === 'confirm' ? <ConfirmModal options={active.options} onClose={close} /> : null}
      {active?.kind === 'form' ? <FormModal spec={active.spec} onClose={close} /> : null}
    </DialogContext.Provider>
  )
}

export function useDialog(): DialogApi {
  const api = useContext(DialogContext)
  if (!api) throw new Error('useDialog harus dipakai di dalam <DialogProvider>.')
  return api
}
