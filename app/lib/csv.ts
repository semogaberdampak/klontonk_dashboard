// Ekspor CSV. Pemisah titik koma agar langsung rapi di Excel versi Indonesia.

export interface CsvColumn<T> {
  label: string
  key?: keyof T
  value?: (row: T) => unknown
}

function cell(value: unknown): string {
  const teks = value === null || value === undefined ? '' : String(value)
  return /[";\n]/.test(teks) ? '"' + teks.replace(/"/g, '""') + '"' : teks
}

export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const head = columns.map((c) => cell(c.label)).join(';')
  const body = rows
    .map((row) => columns.map((c) => cell(c.value ? c.value(row) : c.key ? row[c.key] : '')).join(';'))
    .join('\n')
  return head + '\n' + body
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM di depan agar Excel membaca UTF-8 dengan benar.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
