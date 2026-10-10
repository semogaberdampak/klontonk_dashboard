import type { ReactNode } from 'react'
import type { Option } from '@/lib/lookups'

// Kontrol isian untuk bar filter. Semuanya terkendali (controlled) oleh draft di controller.

interface FieldProps {
  id: string
  label: string
  grow?: boolean
  children: ReactNode
}

export function Field({ id, label, grow = false, children }: FieldProps) {
  return (
    <div className={`field${grow ? ' grow' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  )
}

interface SelectFieldProps {
  id: string
  label: string
  value: string
  options: readonly Option[]
  onChange: (value: string) => void
  grow?: boolean
}

export function SelectField({ id, label, value, options, onChange, grow }: SelectFieldProps) {
  return (
    <Field id={id} label={label} grow={grow}>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

interface InputFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'search' | 'date' | 'text'
  placeholder?: string
  grow?: boolean
}

export function InputField({ id, label, value, onChange, type = 'search', placeholder, grow }: InputFieldProps) {
  return (
    <Field id={id} label={label} grow={grow}>
      <input id={id} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}

interface FilterBarProps {
  onSubmit: () => void
  onClear?: () => void
  children: ReactNode
  /** Tombol di sisi kanan (Tambah / Unduh CSV). */
  trailing?: ReactNode
}

export function FilterBar({ onSubmit, onClear, children, trailing }: FilterBarProps) {
  return (
    <form
      className="filters"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      {children}
      <button type="submit" className="btn btn-primary">
        Terapkan
      </button>
      {onClear ? (
        <button type="button" className="btn btn-secondary" onClick={onClear}>
          Bersihkan
        </button>
      ) : null}
      {trailing ? <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>{trailing}</span> : null}
    </form>
  )
}
