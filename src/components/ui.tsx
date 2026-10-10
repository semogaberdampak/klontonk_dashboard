import type { ReactNode } from 'react'
import type { Tone } from '@/lib/format'
import { formatNumber } from '@/lib/format'
import type { ResourceState } from '@/hooks/useResource'

// Blok tampilan kecil yang dipakai seluruh halaman. Nama class CSS sama dengan versi lama
// sehingga styles.css tidak berubah. Semua teks dari database dirender lewat React, yang
// otomatis meng-escape nilainya (tidak ada innerHTML).

export function Loading({ text = 'Memuat data...' }: { text?: string }) {
  return (
    <div className="loading">
      <span className="spinner" />
      {text}
    </div>
  )
}

export function ErrorBox({ message, title = 'Gagal memuat data' }: { message: string; title?: string }) {
  return (
    <div className="card">
      <div className="card-head">
        <h2>{title}</h2>
      </div>
      <p className="muted">{message}</p>
      <p className="hint">Periksa koneksi internet, lalu tekan "Muat ulang" di kanan atas.</p>
    </div>
  )
}

/** Tampilkan Loading / ErrorBox sesuai status, atau isi halaman bila data siap. */
export function Resource<T>({ state, children }: { state: ResourceState<T>; children: (data: T) => ReactNode }) {
  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorBox message={state.message} />
  return <>{children(state.data)}</>
}

export function Badge({ children, tone = '' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className="badge" data-tone={tone || undefined}>
      {children}
    </span>
  )
}

interface CardProps {
  title?: string
  hint?: string
  children: ReactNode
}

export function Card({ title, hint, children }: CardProps) {
  return (
    <section className="card">
      {title ? (
        <div className="card-head">
          <div>
            <h2>{title}</h2>
            {hint ? <p className="hint">{hint}</p> : null}
          </div>
        </div>
      ) : null}
      {children}
    </section>
  )
}

export type StatTone = 'warning' | 'danger' | 'success' | ''

export function Stat({ label, value, note, tone = '' }: { label: string; value: string; note?: string; tone?: StatTone }) {
  return (
    <div className="stat" data-tone={tone || undefined}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {note ? <div className="stat-note">{note}</div> : null}
    </div>
  )
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="stat-grid">{children}</div>
}

/** Nama tebal dengan keterangan kecil di bawahnya (sel tabel yang paling sering dipakai). */
export function CellStack({ main, sub, strong = false }: { main: ReactNode; sub?: ReactNode; strong?: boolean }) {
  return (
    <>
      {strong ? <span className="cell-strong">{main}</span> : main}
      {sub ? <span className="cell-sub">{sub}</span> : null}
    </>
  )
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="mono">{children}</span>
}

export interface Column<T> {
  label: string
  align?: 'num'
  render: (row: T, index: number) => ReactNode
}

interface DataTableProps<T> {
  columns: readonly Column<T>[]
  rows: readonly T[]
  rowKey: (row: T, index: number) => string | number
  empty?: string
}

const isBlank = (node: ReactNode): boolean => node === null || node === undefined || node === false || node === ''

export function DataTable<T>({ columns, rows, rowKey, empty = 'Belum ada data.' }: DataTableProps<T>) {
  if (!rows.length) return <div className="empty">{empty}</div>
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column, i) => (
              <th key={i} className={column.align}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((column, i) => {
                const content = column.render(row, index)
                return (
                  <td key={i} className={column.align}>
                    {isBlank(content) ? '-' : content}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export interface RowButton {
  label: string
  onClick: () => void
  tone?: 'ghost' | 'secondary' | 'primary' | 'danger'
  title?: string
}

/** Baris tombol aksi di kolom kanan tabel. */
export function RowActions({ buttons }: { buttons: readonly (RowButton | false | null)[] }) {
  const aktif = buttons.filter((b): b is RowButton => Boolean(b))
  if (!aktif.length) return null
  return (
    <div className="row-actions">
      {aktif.map((b) => (
        <button key={b.label} type="button" className={`btn btn-${b.tone ?? 'ghost'} btn-sm`} title={b.title} onClick={b.onClick}>
          {b.label}
        </button>
      ))}
    </div>
  )
}

interface PagerProps {
  total: number
  limit: number
  offset: number
  onGo: (offset: number) => void
}

export function Pager({ total, limit, offset, onGo }: PagerProps) {
  const dari = total === 0 ? 0 : offset + 1
  const sampai = Math.min(offset + limit, total)
  const halaman = Math.floor(offset / limit) + 1
  const totalHalaman = Math.max(1, Math.ceil(total / limit))
  return (
    <div className="pager">
      <span>
        Menampilkan{' '}
        <strong>
          {formatNumber(dari)}-{formatNumber(sampai)}
        </strong>{' '}
        dari <strong>{formatNumber(total)}</strong> baris
      </span>
      <span className="group">
        <button type="button" className="btn btn-secondary btn-sm" disabled={offset <= 0} onClick={() => onGo(Math.max(0, offset - limit))}>
          Sebelumnya
        </button>
        <span>
          Halaman {halaman} / {totalHalaman}
        </span>
        <button type="button" className="btn btn-secondary btn-sm" disabled={sampai >= total} onClick={() => onGo(offset + limit)}>
          Berikutnya
        </button>
      </span>
    </div>
  )
}
