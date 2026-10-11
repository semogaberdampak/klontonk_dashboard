import type { Tone } from '~/lib/format'

export interface Column {
  /** Nama slot sel: <template #cell-{key}="{ row }">. Tanpa slot, nilai row[key] yang ditampilkan. */
  key: string
  label: string
  align?: 'num'
}

export interface RowButton {
  label: string
  onClick: () => void
  tone?: 'ghost' | 'secondary' | 'primary' | 'danger'
  title?: string
}

export type { Tone }
export type StatTone = 'warning' | 'danger' | 'success' | ''
