import type { Option } from '~/lib/lookups'

export type FieldType = 'text' | 'number' | 'email' | 'password' | 'date' | 'textarea' | 'select' | 'checkbox'

export interface FormField {
  name: string
  label: string
  type?: FieldType
  required?: boolean
  placeholder?: string
  hint?: string
  options?: Option[]
  min?: number
  max?: number
  maxlength?: number
  /** Dua field `half` yang berurutan ditampilkan sebaris. */
  half?: boolean
}

export type FormValue = string | boolean
export type FormValues = Record<string, FormValue>
export type SubmitResult = { success: true } | { success: false; error: string }

export interface FormSpec {
  title: string
  fields: FormField[]
  values?: Record<string, FormValue | number | null | undefined>
  submitText?: string
  wide?: boolean
  note?: string
  /** Modal hanya tertutup bila berhasil, sehingga pengguna bisa memperbaiki isian. */
  onSubmit: (values: FormValues) => Promise<SubmitResult>
}

export interface ConfirmOptions {
  title?: string
  message?: string
  confirmText?: string
  /** null = hanya satu tombol (pemberitahuan). */
  cancelText?: string | null
  variant?: 'primary' | 'danger'
}
