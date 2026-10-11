import type { ConfirmOptions, FormSpec } from '~/models/formTypes'

export type ActiveDialog =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'form'; spec: FormSpec; resolve: (value: boolean) => void }

/** Dialog konfirmasi dan form-modal generik. Dirender oleh <DialogHost> di app.vue. */
export function useDialog() {
  const active = useState<ActiveDialog | null>('dialog-active', () => null)

  const confirm = (options: ConfirmOptions): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
      active.value = { kind: 'confirm', options, resolve }
    })

  const openForm = (spec: FormSpec): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
      active.value = { kind: 'form', spec, resolve }
    })

  const notify = async (options: Omit<ConfirmOptions, 'cancelText'>): Promise<void> => {
    await confirm({ ...options, cancelText: null })
  }

  const confirmDelete = (title: string, message: string): Promise<boolean> =>
    confirm({ title, message, confirmText: 'Ya, Hapus', cancelText: 'Batal', variant: 'danger' })

  const close = (value: boolean): void => {
    active.value?.resolve(value)
    active.value = null
  }

  return { active, confirm, openForm, notify, confirmDelete, close }
}
