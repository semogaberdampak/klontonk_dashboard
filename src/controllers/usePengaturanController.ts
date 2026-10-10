import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useDialog } from '@/context/DialogContext'
import { useReload } from '@/context/ReloadContext'
import { useToast } from '@/context/ToastContext'
import { useResource } from '@/hooks/useResource'
import { clearAppCache } from '@/lib/serviceWorker'
import { formatNumber, toNumber } from '@/lib/format'
import { purgeOldLogs, systemCounts } from '@/models/repositories/systemRepository'
import { ok, pesanError } from '@/models/result'

export const RETENSI_AUDIT_DEFAULT = 180 // 6 bulan
export const RETENSI_EVENT_DEFAULT = 60 // 2 bulan
const RELOAD_DELAY_MS = 800

/** Isian hari dari input; kembali ke nilai bawaan bila kosong atau bukan angka. */
export const daysOrDefault = (value: string, fallback: number): number => Number(value) || fallback

export function usePengaturanController() {
  const { admin } = useAuth()
  const dialog = useDialog()
  const toast = useToast()
  const { reload } = useReload()
  const [auditDays, setAuditDays] = useState(String(RETENSI_AUDIT_DEFAULT))
  const [eventDays, setEventDays] = useState(String(RETENSI_EVENT_DEFAULT))

  const state = useResource(async () => ok(await systemCounts()), [])

  const pangkas = async () => {
    const audit = daysOrDefault(auditDays, RETENSI_AUDIT_DEFAULT)
    const event = daysOrDefault(eventDays, RETENSI_EVENT_DEFAULT)
    const yakin = await dialog.confirm({
      title: 'Pangkas log lama',
      message: `Hapus log audit lebih tua dari ${audit} hari dan log teknis lebih tua dari ${event} hari? Tindakan ini tidak bisa dibatalkan.`,
      confirmText: 'Ya, Pangkas',
      cancelText: 'Batal',
      variant: 'danger'
    })
    if (!yakin) return

    const hasil = await purgeOldLogs(audit, event)
    if (!hasil.ok) return toast(pesanError(hasil.error), { type: 'danger', duration: 8000 })
    toast(
      `Selesai: ${formatNumber(toNumber(hasil.data.audit_deleted))} baris log audit dan ${formatNumber(toNumber(hasil.data.events_deleted))} baris log teknis dihapus.`,
      { type: 'success', duration: 8000 }
    )
    reload()
  }

  const bersihkanCache = async () => {
    const hasil = await clearAppCache()
    if (hasil.ok) {
      toast('Cache dibersihkan. Memuat ulang...', { type: 'success' })
      setTimeout(() => window.location.reload(), RELOAD_DELAY_MS)
    } else {
      toast('Gagal membersihkan cache. Coba muat ulang halaman.', { type: 'warning' })
    }
  }

  return { admin, state, auditDays, setAuditDays, eventDays, setEventDays, pangkas, bersihkanCache }
}
