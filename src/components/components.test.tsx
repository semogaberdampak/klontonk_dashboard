import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FormModal } from './FormModal'
import { ConfirmModal } from './ConfirmModal'
import { DataTable, Pager, RowActions, Badge, Resource } from './ui'
import type { FormSpec } from './formTypes'

describe('DataTable', () => {
  const columns = [
    { label: 'Nama', render: (r: { nama: string; nilai: string | null }) => r.nama },
    { label: 'Nilai', align: 'num' as const, render: (r: { nama: string; nilai: string | null }) => r.nilai }
  ]

  it('menampilkan pesan kosong bila tidak ada baris', () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.nama} empty="Belum ada data." />)
    expect(screen.getByText('Belum ada data.')).toBeTruthy()
  })

  it('menampilkan "-" untuk sel kosong dan tidak menafsirkan HTML dari data', () => {
    render(<DataTable columns={columns} rows={[{ nama: '<img src=x onerror=alert(1)>', nilai: null }]} rowKey={(r) => r.nama} />)
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy()
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText('-')).toBeTruthy()
  })
})

describe('Pager', () => {
  it('menampilkan rentang, menonaktifkan tombol di ujung, dan memanggil onGo', () => {
    const onGo = vi.fn()
    render(<Pager total={120} limit={50} offset={0} onGo={onGo} />)
    expect(screen.getByText(/Halaman 1 \/ 3/)).toBeTruthy()
    expect((screen.getByText('Sebelumnya') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByText('Berikutnya'))
    expect(onGo).toHaveBeenCalledWith(50)
  })

  it('tombol Berikutnya nonaktif di halaman terakhir; Sebelumnya tidak pernah negatif', () => {
    const onGo = vi.fn()
    render(<Pager total={120} limit={50} offset={100} onGo={onGo} />)
    expect((screen.getByText('Berikutnya') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByText('Sebelumnya'))
    expect(onGo).toHaveBeenCalledWith(50)
  })

  it('total nol menampilkan 0-0', () => {
    render(<Pager total={0} limit={50} offset={0} onGo={() => undefined} />)
    expect(screen.getByText('0-0')).toBeTruthy()
  })
})

describe('RowActions & Badge & Resource', () => {
  it('RowActions membuang tombol false/null dan memanggil handler', () => {
    const klik = vi.fn()
    render(<RowActions buttons={[{ label: 'Ubah', onClick: klik }, false, null]} />)
    fireEvent.click(screen.getByText('Ubah'))
    expect(klik).toHaveBeenCalled()
  })

  it('Badge menaruh tone di atribut data', () => {
    render(<Badge tone="ok">aktif</Badge>)
    expect(screen.getByText('aktif').getAttribute('data-tone')).toBe('ok')
  })

  it('Resource menampilkan loading, error, lalu isi', () => {
    const { rerender } = render(<Resource state={{ status: 'loading' }}>{() => <p>isi</p>}</Resource>)
    expect(screen.getByText('Memuat data...')).toBeTruthy()
    rerender(<Resource state={{ status: 'error', message: 'gagal total' }}>{() => <p>isi</p>}</Resource>)
    expect(screen.getByText('gagal total')).toBeTruthy()
    rerender(<Resource state={{ status: 'ready', data: 1 }}>{() => <p>isi</p>}</Resource>)
    expect(screen.getByText('isi')).toBeTruthy()
  })
})

describe('FormModal', () => {
  const spec = (onSubmit: FormSpec['onSubmit']): FormSpec => ({
    title: 'Tambah paket',
    fields: [
      { name: 'name', label: 'Nama', required: true },
      { name: 'harga', label: 'Harga', type: 'number', values: undefined } as never,
      { name: 'aktif', label: 'Aktif', type: 'checkbox' },
      { name: 'tipe', label: 'Tipe', type: 'select', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }
    ],
    values: { harga: 100, aktif: true, tipe: 'b' },
    onSubmit
  })

  it('menolak kirim bila field wajib kosong dan tidak memanggil onSubmit', () => {
    const onSubmit = vi.fn()
    const onClose = vi.fn()
    render(<FormModal spec={spec(onSubmit)} onClose={onClose} />)
    fireEvent.click(screen.getByText('Simpan'))
    expect(screen.getByText('Nama wajib diisi.')).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('mengirim nilai yang sudah dipangkas, memulihkan nilai awal, lalu menutup saat berhasil', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true })
    const onClose = vi.fn()
    render(<FormModal spec={spec(onSubmit)} onClose={onClose} />)
    fireEvent.change(screen.getByLabelText(/Nama/), { target: { value: '  Basic  ' } })
    fireEvent.click(screen.getByText('Simpan'))
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true))
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Basic', harga: '100', aktif: true, tipe: 'b' })
  })

  it('tetap terbuka dan menampilkan pesan bila onSubmit gagal', async () => {
    const onClose = vi.fn()
    render(<FormModal spec={spec(async () => ({ success: false, error: 'Kode sudah ada.' }))} onClose={onClose} />)
    fireEvent.change(screen.getByLabelText(/Nama/), { target: { value: 'X' } })
    fireEvent.click(screen.getByText('Simpan'))
    await waitFor(() => expect(screen.getByText('Kode sudah ada.')).toBeTruthy())
    expect(onClose).not.toHaveBeenCalled()
  })

  it('menangkap exception dari onSubmit', async () => {
    render(<FormModal spec={spec(async () => { throw new Error('boom') })} onClose={() => undefined} />)
    fireEvent.change(screen.getByLabelText(/Nama/), { target: { value: 'X' } })
    fireEvent.click(screen.getByText('Simpan'))
    await waitFor(() => expect(screen.getByText('Terjadi kesalahan. Coba lagi.')).toBeTruthy())
  })

  it('Escape dan tombol Batal menutup tanpa menyimpan', () => {
    const onClose = vi.fn()
    render(<FormModal spec={spec(vi.fn())} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByText('Batal'))
    expect(onClose).toHaveBeenCalledTimes(2)
    expect(onClose).toHaveBeenCalledWith(false)
  })
})

describe('ConfirmModal', () => {
  it('konfirmasi dengan tombol batal: Escape berarti false', () => {
    const onClose = vi.fn()
    render(<ConfirmModal options={{ title: 'Hapus', message: 'Yakin?', confirmText: 'Ya', cancelText: 'Batal' }} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenLastCalledWith(false)
    fireEvent.click(screen.getByText('Ya'))
    expect(onClose).toHaveBeenLastCalledWith(true)
  })

  it('pemberitahuan tanpa tombol batal: Escape dihitung OK', () => {
    const onClose = vi.fn()
    render(<ConfirmModal options={{ title: 'Info', message: 'Selesai', confirmText: 'Tutup' }} onClose={onClose} />)
    expect(screen.queryByText('Batal')).toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledWith(true)
  })
})
