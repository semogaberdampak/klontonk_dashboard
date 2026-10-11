/**
 * Salinan kerja dari filter di URL untuk isian formulir. Dipulihkan setiap kali filter di URL
 * berubah (mis. tombol "Bersihkan" atau pindah halaman), sedangkan ketikan pengguna tidak
 * mengubah URL sebelum tombol "Terapkan" ditekan.
 */
export function useDraft<T extends object>(source: () => T): T {
  const draft = reactive({ ...source() }) as T
  watch(
    () => JSON.stringify(source()),
    () => Object.assign(draft, source())
  )
  return draft
}
