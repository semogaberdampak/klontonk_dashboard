import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { FormField, FormSpec, FormValues } from './formTypes'

interface FormModalProps {
  spec: FormSpec
  onClose: (saved: boolean) => void
}

const toText = (value: string | number | boolean | null | undefined): string =>
  value === null || value === undefined || typeof value === 'boolean' ? '' : String(value)

function initialValues(spec: FormSpec): FormValues {
  const awal: FormValues = {}
  for (const field of spec.fields) {
    const nilai = spec.values?.[field.name]
    awal[field.name] = field.type === 'checkbox' ? Boolean(nilai) : toText(nilai)
  }
  return awal
}

/** Pasangkan field `half` yang berurutan menjadi satu baris. */
function groupRows(fields: FormField[]): FormField[][] {
  const baris: FormField[][] = []
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    const next = fields[i + 1]
    if (field && field.half && next && next.half) {
      baris.push([field, next])
      i++
    } else if (field) {
      baris.push([field])
    }
  }
  return baris
}

export function FormModal({ spec, onClose }: FormModalProps) {
  const [values, setValues] = useState<FormValues>(() => initialValues(spec))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const setValue = (name: string, value: string | boolean) => setValues((current) => ({ ...current, [name]: value }))

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    setError(null)

    const trimmed: FormValues = {}
    for (const field of spec.fields) {
      const nilai = values[field.name]
      trimmed[field.name] = typeof nilai === 'string' ? nilai.trim() : Boolean(nilai)
    }
    for (const field of spec.fields) {
      if (field.required && field.type !== 'checkbox' && !trimmed[field.name]) {
        setError(`${field.label} wajib diisi.`)
        return
      }
    }

    setBusy(true)
    try {
      const result = await spec.onSubmit(trimmed)
      if (result.success) onClose(true)
      else setError(result.error || 'Gagal menyimpan. Coba lagi.')
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  const renderField = (field: FormField): ReactNode => {
    const id = `fm_${field.name}`
    const value = values[field.name]
    const text = typeof value === 'string' ? value : ''
    const hint = field.hint ? <span className="hint">{field.hint}</span> : null

    if (field.type === 'checkbox') {
      return (
        <div className="field grow" key={field.name}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              id={id}
              name={field.name}
              checked={value === true}
              onChange={(event) => setValue(field.name, event.target.checked)}
            />
            <span>{field.label}</span>
          </label>
          {hint}
        </div>
      )
    }

    let control: ReactNode
    if (field.type === 'select') {
      control = (
        <select id={id} name={field.name} required={field.required} value={text} onChange={(e) => setValue(field.name, e.target.value)}>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    } else if (field.type === 'textarea') {
      control = (
        <textarea
          id={id}
          name={field.name}
          rows={3}
          required={field.required}
          placeholder={field.placeholder}
          maxLength={field.maxlength}
          value={text}
          onChange={(e) => setValue(field.name, e.target.value)}
        />
      )
    } else {
      control = (
        <input
          type={field.type ?? 'text'}
          id={id}
          name={field.name}
          required={field.required}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          maxLength={field.maxlength}
          value={text}
          onChange={(e) => setValue(field.name, e.target.value)}
        />
      )
    }

    return (
      <div className={`field${field.half ? '' : ' grow'}`} key={field.name}>
        <label htmlFor={id}>
          {field.label}
          {field.required ? ' *' : ''}
        </label>
        {control}
        {hint}
      </div>
    )
  }

  return (
    <div className="modal-root visible" aria-hidden="false">
      <div className="modal-backdrop" onClick={() => onClose(false)} />
      <div className={`modal-dialog${spec.wide ? ' wide' : ''}`} role="dialog" aria-modal="true" ref={dialogRef}>
        <h2 className="modal-title">{spec.title}</h2>
        {spec.note ? <p className="hint">{spec.note}</p> : null}
        <form className="modal-form" autoComplete="off" noValidate onSubmit={submit}>
          {groupRows(spec.fields).map((baris) =>
            baris.length === 2 ? (
              <div className="form-row" key={baris.map((f) => f.name).join('+')}>
                {baris.map(renderField)}
              </div>
            ) : (
              baris.map(renderField)
            )
          )}
        </form>
        {error ? <div className="form-error">{error}</div> : null}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => onClose(false)}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} aria-busy={busy || undefined} onClick={() => void submit()}>
            {spec.submitText ?? 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
