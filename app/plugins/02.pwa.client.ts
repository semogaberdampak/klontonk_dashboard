// Service worker (PWA): hanya di produksi supaya server dev tidak ter-cache.
export default defineNuxtPlugin(() => {
  if (import.meta.dev || !('serviceWorker' in navigator)) return
  const base = useRuntimeConfig().app.baseURL
  navigator.serviceWorker
    .register(`${base}sw.js`, { updateViaCache: 'none' })
    .catch((error: unknown) => console.warn('[PWA] Service worker gagal didaftarkan:', error))
})
