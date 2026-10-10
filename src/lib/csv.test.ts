import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

interface Row {
  nama: string
  jumlah: number | null
}

describe('toCsv', () => {
  const columns = [
    { label: 'nama', key: 'nama' as const },
    { label: 'jumlah', key: 'jumlah' as const }
  ]

  it('memakai titik koma sebagai pemisah dan menyertakan header', () => {
    const rows: Row[] = [{ nama: 'Kopi', jumlah: 3 }]
    expect(toCsv(rows, columns)).toBe('nama;jumlah\nKopi;3')
  })

  it('mengosongkan null dan undefined', () => {
    expect(toCsv<Row>([{ nama: 'Teh', jumlah: null }], columns)).toBe('nama;jumlah\nTeh;')
  })

  it('mengutip sel berisi titik koma, kutip, atau baris baru', () => {
    const rows: Row[] = [{ nama: 'a;b "c"\nd', jumlah: 1 }]
    expect(toCsv(rows, columns)).toBe('nama;jumlah\n"a;b ""c""\nd";1')
  })

  it('mendukung kolom turunan lewat value()', () => {
    const rows: Row[] = [{ nama: 'Gula', jumlah: 2 }]
    const csv = toCsv(rows, [{ label: 'ganda', value: (r) => (r.jumlah ?? 0) * 2 }])
    expect(csv).toBe('ganda\n4')
  })
})
