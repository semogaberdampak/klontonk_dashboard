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
import { hariIni, tambahHari } from '@/lib/dates'
import { formatDate, toNumber } from '@/lib/format'
import { parseOffset } from '@/lib/query'
import {
  createSubscription, deleteSubscription, extendSubscription, listSubscriptionSummary, markExpired, pageSubscriptions, updateSubscription,
  type SubscriptionFilters, type SubscriptionSummary
} from '@/models/repositories/subscriptionRepository'
import { ok, pesanError } from '@/models/result'
import type { Subscription, SubscriptionStatus } from '@/models/types'

// Yang benar-benar mengunci POS adalah trigger di database, bukan halaman ini. Jadi mengubah
// status di sini langsung berpengaruh ke client.

export const LANGGANAN_LIMIT = 25
const PATH = '/langganan'
const PERPANJANG_HARI = 30
const AMBANG_HARI = 14
const STATUSES: readonly SubscriptionStatus[] = ['trial', 'aktif', 'jatuh_tempo', 'berhenti']

export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Semua status' },
  { value: 'trial', label: 'Trial' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'jatuh_tempo', label: 'Jatuh tempo' },
  { value: 'berhenti', label: 'Berhenti' }
]

const STATUS_FORM_OPTIONS = STATUS_FILTER_OPTIONS.slice(1)

export interface LanggananSummary {
  berlaku: SubscriptionSummary[]
  trial: SubscriptionSummary[]
  perhatian: SubscriptionSummary[]
  /** Total harga per bulan dari paket yang sedang berlaku. */
  potensi: number
}

export function summarize(ringkas: readonly SubscriptionSummary[]): LanggananSummary {
  const berlaku = ringkas.filter((c) => (c.sub_status === 'trial' || c.sub_status === 'aktif') && Number(c.days_left) >= 0)
  const perhatian = ringkas.filter(
    (c) => c.days_left === null || c.days_left === undefined || Number(c.days_left) < 0 || Number(c.days_left) <= AMBANG_HARI || c.sub_status === 'berhenti'
  )
  return {
    berlaku,
    trial: berlaku.filter((c) => c.sub_status === 'trial'),
    perhatian,
    potensi: berlaku.reduce((total, c) => total + toNumber(c.price_month), 0)
  }
}

const parseFilters = (params: URLSearchParams): SubscriptionFilters => ({
  client: params.get('client') ?? '',
  status: oneOf(params.get('status'), STATUSES),
  offset: parseOffset(params.get('offset'))
})

export function useLanggananController() {
  const go = useGo()
  const dialog = useDialog()
  const toast = useToast()
  const { reload } = useReload()
  const { api, refresh } = useLookups()
  const { filters, key } = useUrlFilters(parseFilters)
  const [draft, setField] = useDraft({ client: filters.client, status: filters.status as string })

  const state = useResource(async () => {
    const [riwayat, ringkas] = await Promise.all([pageSubscriptions(filters, LANGGANAN_LIMIT), listSubscriptionSummary()])
    if (!riwayat.ok) return riwayat
    return ok({ riwayat: riwayat.data, ringkas: ringkas.ok ? ringkas.data : [] })
  }, [key])

  const apply = () => go(PATH, { client: draft.client, status: draft.status })
  const clear = () => go(PATH)
  const goPage = (offset: number) => go(PATH, { client: filters.client, status: filters.status, offset })

  const saved = useCallback(
    async (message: string, withLookups = false) => {
      toast(message, { type: 'success' })
      if (withLookups) await refresh()
      reload()
    },
    [toast, refresh, reload]
  )

  const tambah = useCallback(() => {
    const klien = api.clientOptions()
    const paket = api.planOptions({ activeOnly: true })
    const opsiPaket = paket.length ? paket : [{ value: 'internal', label: 'Internal' }]
    const spec: FormSpec = {
      title: 'Catat langganan',
      note: 'Gunakan untuk memperpanjang atau mengganti paket. Beberapa baris langganan boleh ada; yang dihitung sebagai berlaku adalah yang paling akhir masa berlakunya.',
      submitText: 'Simpan langganan',
      wide: true,
      fields: [
        { name: 'client', label: 'Client', type: 'select', required: true, options: klien },
        { name: 'paket', label: 'Paket', type: 'select', required: true, options: opsiPaket },
        { name: 'mulai', label: 'Mulai', type: 'date', required: true, half: true },
        { name: 'berakhir', label: 'Berakhir', type: 'date', required: true, half: true },
        { name: 'status', label: 'Status', type: 'select', half: true, options: STATUS_FORM_OPTIONS },
        { name: 'catatan', label: 'Catatan', half: true, maxlength: 200, placeholder: 'cth: pembayaran transfer 1 tahun' }
      ],
      values: {
        client: filters.client || klien[0]?.value || '',
        paket: opsiPaket[0]?.value ?? 'internal',
        mulai: hariIni(),
        berakhir: tambahHari(hariIni(), PERPANJANG_HARI),
        status: 'aktif'
      },
      onSubmit: async (nilai) => {
        const mulai = String(nilai.mulai)
        const berakhir = String(nilai.berakhir)
        if (berakhir < mulai) return { success: false, error: 'Tanggal berakhir tidak boleh sebelum tanggal mulai.' }
        const hasil = await createSubscription({
          clientId: String(nilai.client),
          planCode: String(nilai.paket),
          startedAt: mulai,
          expiresAt: berakhir,
          status: oneOf(String(nilai.status), STATUSES) || 'aktif',
          note: String(nilai.catatan) || null
        })
        if (!hasil.ok) return { success: false, error: pesanError(hasil.error) }
        await saved('Langganan disimpan.', true)
        return { success: true }
      }
    }
    void dialog.openForm(spec)
  }, [api, dialog, filters.client, saved])

  const ubah = useCallback(
    (baris: Subscription) => {
      void dialog.openForm({
        title: `Ubah langganan ${baris.client ? baris.client.name : baris.client_id}`,
        submitText: 'Simpan perubahan',
        wide: true,
        fields: [
          { name: 'paket', label: 'Paket', type: 'select', required: true, options: api.planOptions({ activeOnly: true }) },
          { name: 'status', label: 'Status', type: 'select', half: true, options: STATUS_FORM_OPTIONS },
          { name: 'berakhir', label: 'Berakhir', type: 'date', half: true, required: true },
          { name: 'catatan', label: 'Catatan', maxlength: 200 }
        ],
        values: { paket: baris.plan_code, status: baris.status, berakhir: baris.expires_at, catatan: baris.note ?? '' },
        onSubmit: async (nilai) => {
          const berakhir = String(nilai.berakhir)
          if (berakhir < baris.started_at) return { success: false, error: 'Tanggal berakhir tidak boleh sebelum tanggal mulai.' }
          const hasil = await updateSubscription(baris.id, {
            plan_code: String(nilai.paket),
            status: oneOf(String(nilai.status), STATUSES) || baris.status,
            expires_at: berakhir,
            note: String(nilai.catatan) || null
          })
          if (!hasil.ok) return { success: false, error: pesanError(hasil.error) }
          await saved('Langganan diperbarui.')
          return { success: true }
        }
      })
    },
    [api, dialog, saved]
  )

  const sinkron = useCallback(async () => {
    const yakin = await dialog.confirm({
      title: 'Sinkronkan status langganan',
      message: 'Semua langganan trial/aktif yang masa berlakunya sudah lewat akan ditandai "jatuh tempo". Lanjutkan?',
      confirmText: 'Ya, Sinkronkan',
      cancelText: 'Batal'
    })
    if (!yakin) return
    const hasil = await markExpired(hariIni())
    if (!hasil.ok) return toast(pesanError(hasil.error), { type: 'danger' })
    const jumlah = hasil.data
    toast(jumlah ? `${jumlah} langganan ditandai jatuh tempo.` : 'Tidak ada langganan yang perlu diubah.', { type: jumlah ? 'success' : 'info' })
    reload()
  }, [dialog, toast, reload])

  const perpanjang = useCallback(
    async (baris: Subscription) => {
      const dasar = baris.expires_at && baris.expires_at >= hariIni() ? baris.expires_at : hariIni()
      const baru = tambahHari(dasar, PERPANJANG_HARI)
      const yakin = await dialog.confirm({
        title: 'Perpanjang langganan',
        message: `Perpanjang sampai ${formatDate(baru)} (+${PERPANJANG_HARI} hari) dan tandai aktif?`,
        confirmText: 'Ya, Perpanjang',
        cancelText: 'Batal'
      })
      if (!yakin) return
      const hasil = await extendSubscription(baris.id, baru)
      if (!hasil.ok) return toast(pesanError(hasil.error), { type: 'danger' })
      await saved(`Langganan diperpanjang sampai ${formatDate(baru)}.`)
    },
    [dialog, toast, saved]
  )

  const hapus = useCallback(
    async (baris: Subscription) => {
      const yakin = await dialog.confirmDelete('Hapus catatan langganan', 'Catatan langganan ini akan dihapus. Tindakan ini tercatat di log audit. Lanjutkan?')
      if (!yakin) return
      const hasil = await deleteSubscription(baris.id)
      if (!hasil.ok) return toast(pesanError(hasil.error), { type: 'danger' })
      await saved('Catatan langganan dihapus.')
    },
    [dialog, toast, saved]
  )

  return { filters, state, draft, setField, apply, clear, goPage, go, api, tambah, ubah, sinkron, perpanjang, hapus }
}
