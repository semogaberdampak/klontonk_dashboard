import { useCallback } from 'react'
import { useDialog } from '@/context/DialogContext'
import { useLookups } from '@/context/LookupsContext'
import { useReload } from '@/context/ReloadContext'
import { useToast } from '@/context/ToastContext'
import type { FormSpec } from '@/components/formTypes'
import { useDraft } from '@/hooks/useDraft'
import { useGo } from '@/hooks/useGo'
import { useResource } from '@/hooks/useResource'
import { oneOf, useUrlFilters } from '@/hooks/useUrlFilters'
import { parseOffset } from '@/lib/query'
import { createClientWithPlan, setClientStatus, updateClient } from '@/models/repositories/clientRepository'
import { pageOverview, type ClientFilters } from '@/models/repositories/overviewRepository'
import { pesanError } from '@/models/result'
import type { ClientOverview, ClientStatus } from '@/models/types'

// Sumber data: view v_client_overview -- angka cabang/pengguna/transaksi/omzet dihitung di
// database. Pembuatan client memakai RPC create_client_with_plan() agar client + langganan
// trial dibuat dalam satu transaksi (tidak mungkin setengah jadi).

export const KLIEN_LIMIT = 25
const PATH = '/klien'
const STATUSES: readonly ClientStatus[] = ['aktif', 'suspend', 'berhenti']

export const STATUS_OPTIONS = [
  { value: '', label: 'Semua status' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'suspend', label: 'Suspend' },
  { value: 'berhenti', label: 'Berhenti' }
]

export const statusTone = (status: ClientStatus): 'ok' | 'warn' | 'bad' =>
  status === 'aktif' ? 'ok' : status === 'suspend' ? 'warn' : 'bad'

const parseFilters = (params: URLSearchParams): ClientFilters => ({
  cari: (params.get('cari') ?? '').trim(),
  status: oneOf(params.get('status'), STATUSES),
  offset: parseOffset(params.get('offset'))
})

export function useKlienController() {
  const go = useGo()
  const dialog = useDialog()
  const toast = useToast()
  const { reload } = useReload()
  const { api, refresh } = useLookups()
  const { filters, key } = useUrlFilters(parseFilters)
  const [draft, setField] = useDraft({ cari: filters.cari, status: filters.status as string })

  const state = useResource(() => pageOverview(filters, KLIEN_LIMIT), [key])

  const apply = () => go(PATH, { cari: draft.cari.trim(), status: draft.status })
  const clear = () => go(PATH)
  const goPage = (offset: number) => go(PATH, { cari: filters.cari, status: filters.status, offset })

  const tambah = useCallback(() => {
    const paket = api.planOptions({ excludeInternal: true })
    const opsiPaket = paket.length ? paket : [{ value: 'internal', label: 'Internal (non-langganan)' }]
    const spec: FormSpec = {
      title: 'Tambah client',
      note: 'Client + langganan trial dibuat sekaligus. Cabang dan akun dibuat setelah ini.',
      submitText: 'Simpan client',
      wide: true,
      fields: [
        { name: 'nama', label: 'Nama client / usaha', required: true, placeholder: 'cth: Warung Bu Sari', maxlength: 80 },
        { name: 'paket', label: 'Paket awal', type: 'select', required: true, options: opsiPaket, half: true },
        { name: 'trial', label: 'Masa trial (hari)', type: 'number', half: true, min: 0, max: 365, hint: 'Isi 0 untuk langsung berstatus aktif.' },
        { name: 'kontak_nama', label: 'Nama kontak', placeholder: 'cth: Bu Sari', half: true, maxlength: 60 },
        { name: 'kontak_telepon', label: 'Telepon / WhatsApp', placeholder: 'cth: 081234567890', half: true, maxlength: 24 },
        { name: 'kontak_email', label: 'Email kontak', type: 'email', placeholder: 'cth: sari@contoh.com', maxlength: 80 },
        { name: 'catatan', label: 'Catatan', type: 'textarea', maxlength: 200 }
      ],
      values: { paket: opsiPaket[0]?.value ?? '', trial: 14 },
      onSubmit: async (nilai) => {
        const hasil = await createClientWithPlan({
          name: String(nilai.nama),
          planCode: String(nilai.paket),
          contactName: String(nilai.kontak_nama) || null,
          contactPhone: String(nilai.kontak_telepon) || null,
          contactEmail: String(nilai.kontak_email) || null,
          trialDays: Number(nilai.trial) || 0,
          note: String(nilai.catatan) || null
        })
        if (!hasil.ok) return { success: false, error: pesanError(hasil.error) }
        toast(`Client "${String(nilai.nama)}" dibuat.`, { type: 'success' })
        await refresh()
        reload()
        return { success: true }
      }
    }
    void dialog.openForm(spec)
  }, [api, dialog, toast, refresh, reload])

  const ubah = useCallback(
    (baris: ClientOverview) => {
      void dialog.openForm({
        title: `Ubah client ${baris.id}`,
        submitText: 'Simpan perubahan',
        wide: true,
        fields: [
          { name: 'nama', label: 'Nama client / usaha', required: true, maxlength: 80 },
          {
            name: 'status', label: 'Status client', type: 'select', half: true,
            options: [
              { value: 'aktif', label: 'Aktif (bisa memakai POS)' },
              { value: 'suspend', label: 'Suspend (tidak dihentikan permanen)' },
              { value: 'berhenti', label: 'Berhenti (tidak berlangganan lagi)' }
            ]
          },
          { name: 'kontak_nama', label: 'Nama kontak', half: true, maxlength: 60 },
          { name: 'kontak_telepon', label: 'Telepon / WhatsApp', half: true, maxlength: 24 },
          { name: 'kontak_email', label: 'Email kontak', type: 'email', half: true, maxlength: 80 },
          { name: 'catatan', label: 'Catatan', type: 'textarea', maxlength: 200 }
        ],
        values: {
          nama: baris.name,
          status: baris.status,
          kontak_nama: baris.contact_name ?? '',
          kontak_telepon: baris.contact_phone ?? '',
          kontak_email: baris.contact_email ?? '',
          catatan: baris.note ?? ''
        },
        onSubmit: async (nilai) => {
          const hasil = await updateClient(baris.id, {
            name: String(nilai.nama),
            status: oneOf(String(nilai.status), STATUSES) || baris.status,
            contact_name: String(nilai.kontak_nama) || null,
            contact_phone: String(nilai.kontak_telepon) || null,
            contact_email: String(nilai.kontak_email) || null,
            note: String(nilai.catatan) || null
          })
          if (!hasil.ok) return { success: false, error: pesanError(hasil.error) }
          toast('Perubahan client disimpan.', { type: 'success' })
          await refresh()
          reload()
          return { success: true }
        }
      })
    },
    [dialog, toast, refresh, reload]
  )

  const ubahStatus = useCallback(
    async (baris: ClientOverview, statusBaru: 'aktif' | 'suspend') => {
      const suspend = statusBaru === 'suspend'
      const yakin = await dialog.confirm({
        title: suspend ? 'Nonaktifkan client' : 'Aktifkan client',
        message: suspend
          ? 'Client ini ditandai suspend. Catatan: menulis data di POS tetap dikendalikan masa langganan, bukan status ini.'
          : 'Client ini akan ditandai aktif kembali.',
        confirmText: 'Lanjutkan',
        cancelText: 'Batal',
        variant: suspend ? 'danger' : 'primary'
      })
      if (!yakin) return
      const hasil = await setClientStatus(baris.id, statusBaru)
      if (!hasil.ok) return toast(pesanError(hasil.error), { type: 'danger' })
      toast('Status client diperbarui.', { type: 'success' })
      reload()
    },
    [dialog, toast, reload]
  )

  return { filters, state, draft, setField, apply, clear, goPage, go, tambah, ubah, ubahStatus }
}
