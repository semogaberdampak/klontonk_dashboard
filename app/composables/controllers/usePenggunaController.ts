import { EMAIL_DOMAIN } from '~/config'
import { initialOf } from '~/lib/format'
import { tenantIdsFor } from '~/lib/lookups'
import { bersihkanKataKunci, parseOffset } from '~/lib/query'
import { signUpDetached } from '~/models/repositories/authRepository'
import { createProfile, deleteUserByUsername, isUsernameTaken, pageProfiles, updateProfile } from '~/models/repositories/profileRepository'
import { pesanError } from '~/models/result'
import type { Profile, UserRole } from '~/models/types'

// Akun ini dipakai untuk login ke APLIKASI POS memakai USERNAME (bukan email): aplikasi POS
// memetakan username -> <username>@{EMAIL_DOMAIN}. Username unik GLOBAL di database, jadi
// selalu pakai awalan kode client (cth: c0001.budi). Buat akun hanya setelah client + cabang +
// langganan siap, karena trigger batas paket (max_users) menolak bila kuota habis.

export const PENGGUNA_LIMIT = 25
const PATH = '/pengguna'
export const USERNAME_POLA = /^[a-z0-9_.]{3,24}$/

export interface PenggunaFilters {
  client: string
  tenant: string
  cari: string
  offset: number
}

const parseFilters = (params: URLSearchParams): PenggunaFilters => ({
  client: params.get('client') ?? '',
  tenant: params.get('tenant') ?? '',
  cari: bersihkanKataKunci(params.get('cari')),
  offset: parseOffset(params.get('offset'))
})

/** Pesan kesalahan pertama dari aturan password/username, atau null bila lolos. */
export function validateNewAccount(username: string, password: string, tenant: string): string | null {
  if (!USERNAME_POLA.test(username)) return 'Username 3-24 karakter: huruf kecil, angka, titik, underscore.'
  if (!tenant) return 'Pilih cabang lebih dulu (client belum punya cabang?).'
  if (password.length < 8) return 'Password minimal 8 karakter.'
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Password harus mengandung huruf dan angka.'
  if (password.toLowerCase().includes(username)) return 'Password tidak boleh mengandung username.'
  return null
}

const toRole = (value: unknown): UserRole => (value === 'admin' ? 'admin' : 'cashier')

export function usePenggunaController() {
  const go = useGo()
  const dialog = useDialog()
  const { toast } = useToast()
  const { reload } = useReload()
  const { api } = useLookups()
  const { filters, key } = useUrlFilters(parseFilters)
  const draft = useDraft(() => ({ client: filters.value.client, tenant: filters.value.tenant, cari: filters.value.cari }))

  const state = useResource(
    () =>
      pageProfiles(
        { tenantIds: tenantIdsFor(api.value, filters.value.client, filters.value.tenant), cari: filters.value.cari, offset: filters.value.offset },
        PENGGUNA_LIMIT
      ),
    [key, api]
  )

  const apply = () => go(PATH, { client: draft.client, tenant: draft.tenant, cari: draft.cari.trim() })
  const clear = () => go(PATH)
  const goPage = (offset: number) => go(PATH, { client: filters.value.client, tenant: filters.value.tenant, cari: filters.value.cari, offset })
  // Ganti client: cabang pada filter ikut menyesuaikan (mulai dari semua cabang client itu).
  const changeClient = (client: string) => go(PATH, { client, cari: draft.cari.trim() })

  function tambah(): void {
    const opsiClient = api.value.clientOptions()
    const clientTerpilih = filters.value.client || opsiClient[0]?.value || ''
    const opsiCabang = api.value.tenantOptions({ clientId: clientTerpilih })
    const awalan = clientTerpilih ? clientTerpilih.toLowerCase() + '.' : ''

    void dialog.openForm({
      title: 'Buat akun client',
      note: `Akun langsung bisa dipakai login di aplikasi POS memakai username. Pastikan Authentication -> Providers -> Email -> "Confirm email" sudah DIMATIKAN, supaya akun baru tidak menunggu konfirmasi email (${EMAIL_DOMAIN} tidak menerima surat).`,
      submitText: 'Buat akun',
      wide: true,
      fields: [
        { name: 'client', label: 'Client', type: 'select', required: true, options: opsiClient },
        {
          name: 'tenant', label: 'Cabang', type: 'select', required: true,
          options: opsiCabang.length ? opsiCabang : [{ value: '', label: 'Belum ada cabang -- buat cabang dulu' }],
          hint: 'Akun kasir hanya bisa mengakses cabang ini.'
        },
        { name: 'name', label: 'Nama lengkap', required: true, half: true, maxlength: 60, placeholder: 'cth: Budi Kasir' },
        {
          name: 'username', label: 'Username', required: true, half: true, maxlength: 24, placeholder: awalan + 'budi',
          hint: '3-24 karakter: huruf kecil, angka, titik, underscore. Awali dengan kode client.'
        },
        { name: 'password', label: 'Password', type: 'password', required: true, half: true, maxlength: 128, hint: 'Minimal 8 karakter, mengandung huruf dan angka.' },
        {
          name: 'role', label: 'Peran', type: 'select', half: true,
          options: [{ value: 'cashier', label: 'Kasir' }, { value: 'admin', label: 'Admin (boleh mengurus akun client sendiri)' }]
        }
      ],
      values: { client: clientTerpilih, tenant: opsiCabang[0]?.value ?? '', role: 'cashier', username: awalan },
      onSubmit: async (nilai) => {
        const username = String(nilai.username).toLowerCase()
        const nama = String(nilai.name)
        const password = String(nilai.password)
        const tenant = String(nilai.tenant)

        const masalah = validateNewAccount(username, password, tenant)
        if (masalah) return { success: false, error: masalah }

        const terpakai = await isUsernameTaken(username)
        if (!terpakai.ok) return { success: false, error: pesanError(terpakai.error) }
        if (terpakai.data) return { success: false, error: 'Username sudah dipakai. Pakai nama lain.' }

        const daftar = await signUpDetached(`${username}@${EMAIL_DOMAIN}`, password)
        if (!daftar.ok) {
          const { code, status, message } = daftar.error
          if (code === 'user_already_exists' || status === 422 || /duplicate|already|sudah/i.test(message)) {
            return { success: false, error: 'Username ini sudah pernah dipakai di sistem autentikasi. Pakai nama lain.' }
          }
          return { success: false, error: pesanError(daftar.error) }
        }

        const profil = await createProfile({
          id: daftar.data.userId,
          username,
          name: nama,
          role: toRole(nilai.role),
          avatar: initialOf(nama),
          tenantId: tenant
        })
        if (!profil.ok) return { success: false, error: pesanError(profil.error) }

        toast(`Akun "${username}" dibuat. Client bisa login ke POS memakai username itu.`, { type: 'success', duration: 7000 })
        reload()
        return { success: true }
      }
    })
  }

  function ubah(baris: Profile): void {
    void dialog.openForm({
      title: `Ubah akun @${baris.username}`,
      note: 'Username (dipakai untuk login) tidak dapat diubah. Bila perlu username baru, buat akun baru lalu hapus yang lama.',
      submitText: 'Simpan perubahan',
      fields: [
        { name: 'name', label: 'Nama lengkap', required: true, maxlength: 60 },
        { name: 'role', label: 'Peran', type: 'select', half: true, options: [{ value: 'cashier', label: 'Kasir' }, { value: 'admin', label: 'Admin' }] },
        { name: 'tenant', label: 'Cabang', type: 'select', half: true, required: true, options: api.value.tenantOptions({}) }
      ],
      values: { name: baris.name, role: baris.role, tenant: baris.tenant_id },
      onSubmit: async (nilai) => {
        const hasil = await updateProfile(baris.id, { name: String(nilai.name), role: toRole(nilai.role), tenant_id: String(nilai.tenant) })
        if (!hasil.ok) return { success: false, error: pesanError(hasil.error) }
        toast('Akun diperbarui.', { type: 'success' })
        reload()
        return { success: true }
      }
    })
  }

  async function hapus(baris: Profile): Promise<void> {
    const yakin = await dialog.confirmDelete(
      'Hapus akun',
      `Hapus akun @${baris.username}? Akun tidak bisa login lagi dan username-nya bisa dipakai ulang. Riwayat transaksi lama tetap tersimpan.`
    )
    if (!yakin) return
    const hasil = await deleteUserByUsername(baris.username)
    if (!hasil.ok) return toast(pesanError(hasil.error), { type: 'danger', duration: 8000 })
    toast(`Akun @${baris.username} dihapus.`, { type: 'success' })
    reload()
  }

  return { filters, state, draft, apply, clear, goPage, changeClient, api, tambah, ubah, hapus }
}
