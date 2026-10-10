import { useCallback } from 'react'
import { useDialog } from '@/context/DialogContext'
import { useLookups } from '@/context/LookupsContext'
import { useReload } from '@/context/ReloadContext'
import { useToast } from '@/context/ToastContext'
import type { FormField, FormSpec, FormValues } from '@/components/formTypes'
import { useResource } from '@/hooks/useResource'
import { createPlan, deletePlan, listPlans, setPlanActive, updatePlan, type PlanInput } from '@/models/repositories/planRepository'
import { listPlanUsage } from '@/models/repositories/overviewRepository'
import { isReferenceConflict, ok, pesanError, type Result } from '@/models/result'
import type { Plan } from '@/models/types'
import { toNumber } from '@/lib/format'

// Batas jumlah cabang/pengguna pada paket DITEGAKKAN oleh trigger database (check_plan_limit),
// bukan hanya di tampilan ini.

const KODE_POLA = /^[a-z0-9_]{2,20}$/

export interface PaketData {
  paket: Plan[]
  /** kode paket -> jumlah client yang memakainya */
  dipakai: Record<string, number>
}

function kolomForm(termasukKode: boolean): FormField[] {
  const kolom: FormField[] = []
  if (termasukKode) {
    kolom.push({
      name: 'code', label: 'Kode paket', required: true, half: true, maxlength: 20, placeholder: 'cth: umkm_basic',
      hint: 'Huruf kecil/angka/underscore. Tidak bisa diubah setelah dibuat.'
    })
  }
  kolom.push({ name: 'name', label: 'Nama paket', required: true, half: true, maxlength: 40, placeholder: 'cth: UMKM Basic' })
  kolom.push({ name: 'price_month', label: 'Harga per bulan (Rp)', type: 'number', half: true, min: 0, max: 100_000_000 })
  kolom.push({ name: 'max_branches', label: 'Maksimal cabang', type: 'number', half: true, min: 1, max: 999 })
  kolom.push({ name: 'max_users', label: 'Maksimal pengguna', type: 'number', half: true, min: 1, max: 999 })
  kolom.push({ name: 'is_active', label: 'Paket aktif (boleh dipilih saat membuat client baru)', type: 'checkbox' })
  kolom.push({ name: 'note', label: 'Catatan', type: 'textarea', maxlength: 200 })
  return kolom
}

export function toPlanInput(nilai: FormValues): PlanInput {
  return {
    name: String(nilai.name),
    price_month: Number(nilai.price_month) || 0,
    max_branches: Number(nilai.max_branches) || 1,
    max_users: Number(nilai.max_users) || 1,
    is_active: nilai.is_active === true,
    note: String(nilai.note ?? '') || null
  }
}

export function usePaketController() {
  const dialog = useDialog()
  const toast = useToast()
  const { reload } = useReload()
  const { refresh } = useLookups()

  const state = useResource<PaketData>(async () => {
    const [paket, ringkas] = await Promise.all([listPlans(), listPlanUsage()])
    if (!paket.ok) return paket
    const dipakai: Record<string, number> = {}
    if (ringkas.ok) {
      for (const c of ringkas.data) if (c.plan_code) dipakai[c.plan_code] = (dipakai[c.plan_code] ?? 0) + 1
    }
    return ok({ paket: paket.data, dipakai })
  }, [])

  const afterSave = useCallback(async (message: string) => {
    toast(message, { type: 'success' })
    await refresh()
    reload()
  }, [toast, refresh, reload])

  const save = useCallback(
    async (operation: Promise<Result<unknown>>, message: string) => {
      const hasil = await operation
      if (!hasil.ok) return { success: false, error: pesanError(hasil.error) } as const
      await afterSave(message)
      return { success: true } as const
    },
    [afterSave]
  )

  const tambah = useCallback(() => {
    const spec: FormSpec = {
      title: 'Tambah paket',
      submitText: 'Simpan paket',
      wide: true,
      fields: kolomForm(true),
      values: { price_month: 100_000, max_branches: 1, max_users: 3, is_active: true },
      onSubmit: async (nilai) => {
        const kode = String(nilai.code ?? '').trim().toLowerCase()
        if (!KODE_POLA.test(kode)) return { success: false, error: 'Kode paket 2-20 karakter: huruf kecil, angka, underscore.' }
        return save(createPlan(kode, toPlanInput(nilai)), 'Paket dibuat.')
      }
    }
    void dialog.openForm(spec)
  }, [dialog, save])

  const ubah = useCallback(
    (paket: Plan) => {
      void dialog.openForm({
        title: `Ubah paket ${paket.code}`,
        submitText: 'Simpan perubahan',
        wide: true,
        fields: kolomForm(false),
        values: {
          name: paket.name,
          price_month: toNumber(paket.price_month),
          max_branches: paket.max_branches,
          max_users: paket.max_users,
          is_active: paket.is_active,
          note: paket.note ?? ''
        },
        onSubmit: (nilai) => save(updatePlan(paket.code, toPlanInput(nilai)), 'Paket diperbarui.')
      })
    },
    [dialog, save]
  )

  const toggle = useCallback(
    async (paket: Plan) => {
      const hasil = await setPlanActive(paket.code, !paket.is_active)
      if (!hasil.ok) return toast(pesanError(hasil.error), { type: 'danger' })
      await afterSave(paket.is_active ? 'Paket dinonaktifkan.' : 'Paket diaktifkan.')
    },
    [toast, afterSave]
  )

  const hapus = useCallback(
    async (paket: Plan) => {
      const yakin = await dialog.confirmDelete(
        'Hapus paket',
        `Hapus paket "${paket.name}" (${paket.code})? Paket yang masih dipakai langganan akan ditolak oleh database.`
      )
      if (!yakin) return
      const hasil = await deletePlan(paket.code)
      if (!hasil.ok) {
        const pesan = isReferenceConflict(hasil.error)
          ? 'Paket tidak bisa dihapus karena masih dipakai oleh catatan langganan. Nonaktifkan saja.'
          : pesanError(hasil.error)
        return toast(pesan, { type: 'danger', duration: 8000 })
      }
      await afterSave('Paket dihapus.')
    },
    [dialog, toast, afterSave]
  )

  return { state, tambah, ubah, toggle, hapus }
}
