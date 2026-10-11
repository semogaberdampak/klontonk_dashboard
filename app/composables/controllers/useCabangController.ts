import { parseOffset } from '~/lib/query'
import { countUsersByTenant, createTenant, deleteTenant, pageTenants, renameTenant, type TenantFilters } from '~/models/repositories/tenantRepository'
import { isReferenceConflict, ok, pesanError } from '~/models/result'
import type { Tenant } from '~/models/types'

// Satu cabang = satu tenant di aplikasi POS (T001, T002, ...). Hanya admin platform yang boleh
// menambah/mengubah cabang -- batas jumlah cabang ditentukan paket langganan dan ditegakkan trigger
// database. Cabang TIDAK BISA dihapus bila masih punya pengguna, stok, penjualan, atau retur.

export const CABANG_LIMIT = 25
const PATH = '/cabang'

const parseFilters = (params: URLSearchParams): TenantFilters => ({
  client: params.get('client') ?? '',
  cari: (params.get('cari') ?? '').trim(),
  offset: parseOffset(params.get('offset'))
})

export function useCabangController() {
  const go = useGo()
  const dialog = useDialog()
  const { toast } = useToast()
  const { reload } = useReload()
  const { api, refresh } = useLookups()
  const { filters, key } = useUrlFilters(parseFilters)
  const draft = useDraft(() => ({ client: filters.value.client, cari: filters.value.cari }))

  const state = useResource(async () => {
    const halaman = await pageTenants(filters.value, CABANG_LIMIT)
    if (!halaman.ok) return halaman
    const pengguna = await countUsersByTenant(halaman.data.rows.map((t) => t.id))
    return ok({ ...halaman.data, pengguna })
  }, [key])

  const apply = () => go(PATH, { client: draft.client, cari: draft.cari.trim() })
  const clear = () => go(PATH)
  const goPage = (offset: number) => go(PATH, { client: filters.value.client, cari: filters.value.cari, offset })

  function tambah(): void {
    const aktif = api.value.clientOptions({ status: 'aktif' })
    const opsiClient = aktif.length ? aktif : api.value.clientOptions()
    void dialog.openForm({
      title: 'Tambah cabang',
      note: 'Jumlah cabang dibatasi paket langganan client.',
      submitText: 'Simpan cabang',
      fields: [
        { name: 'client', label: 'Client pemilik', type: 'select', required: true, options: opsiClient },
        { name: 'nama', label: 'Nama cabang', required: true, placeholder: 'cth: Cabang Pasar', maxlength: 60, hint: 'ID cabang (T00x) dibuat otomatis oleh database.' }
      ],
      values: { client: filters.value.client || aktif[0]?.value || '' },
      onSubmit: async (nilai) => {
        const hasil = await createTenant(String(nilai.client), String(nilai.nama))
        if (!hasil.ok) return { success: false, error: pesanError(hasil.error) }
        toast(`Cabang ${hasil.data.id} berhasil dibuat.`, { type: 'success' })
        await refresh()
        reload()
        return { success: true }
      }
    })
  }

  function ubah(baris: Tenant): void {
    void dialog.openForm({
      title: `Ubah cabang ${baris.id}`,
      submitText: 'Simpan perubahan',
      fields: [{ name: 'nama', label: 'Nama cabang', required: true, maxlength: 60 }],
      values: { nama: baris.name },
      onSubmit: async (nilai) => {
        const hasil = await renameTenant(baris.id, String(nilai.nama))
        if (!hasil.ok) return { success: false, error: pesanError(hasil.error) }
        toast('Nama cabang disimpan.', { type: 'success' })
        await refresh()
        reload()
        return { success: true }
      }
    })
  }

  async function hapus(baris: Tenant): Promise<void> {
    const yakin = await dialog.confirmDelete(
      'Hapus cabang',
      `Hapus cabang "${baris.name}" (${baris.id})? Cabang yang masih punya pengguna, stok, penjualan, atau retur akan ditolak oleh database -- itu pengaman agar data tidak hilang.`
    )
    if (!yakin) return
    const hasil = await deleteTenant(baris.id)
    if (!hasil.ok) {
      const pesan = isReferenceConflict(hasil.error)
        ? 'Cabang tidak bisa dihapus karena masih memiliki data (pengguna/stok/penjualan/retur).'
        : pesanError(hasil.error)
      return toast(pesan, { type: 'danger', duration: 8000 })
    }
    toast('Cabang dihapus.', { type: 'success' })
    await refresh()
    reload()
  }

  return { filters, state, draft, apply, clear, goPage, go, api, tambah, ubah, hapus }
}
