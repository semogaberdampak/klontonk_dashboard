import { useEffect, useRef } from 'react'
import type { ConfirmOptions } from './formTypes'

interface ConfirmModalProps {
  options: ConfirmOptions
  onClose: (confirmed: boolean) => void
}

export function ConfirmModal({ options, onClose }: ConfirmModalProps) {
  const { title = 'Pemberitahuan', message = '', confirmText = 'OK', cancelText = null, variant = 'primary' } = options
  const confirmRef = useRef<HTMLButtonElement>(null)
  // Menutup lewat Escape/latar: pemberitahuan (tanpa tombol batal) dianggap "OK".
  const dismissValue = cancelText ? false : true

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose(dismissValue)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, dismissValue])

  return (
    <div className="modal-root visible" aria-hidden="false">
      <div className="modal-backdrop" onClick={() => onClose(dismissValue)} />
      <div className="modal-dialog" role="alertdialog" aria-modal="true">
        <h2 className="modal-title">{title}</h2>
        <div className="modal-body">{message}</div>
        <div className="modal-actions">
          {cancelText ? (
            <button type="button" className="btn btn-secondary" onClick={() => onClose(false)}>
              {cancelText}
            </button>
          ) : null}
          <button
            type="button"
            ref={confirmRef}
            className={`btn btn-${variant === 'danger' ? 'danger' : 'primary'}`}
            onClick={() => onClose(true)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
