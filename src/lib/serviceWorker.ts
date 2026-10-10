const CACHE_TIMEOUT_MS = 8000

export interface CacheResult {
  ok: boolean
  precached: number
}

/** Bersihkan cache PWA lewat service worker; bila tidak ada, hapus langsung dari Cache API. */
export async function clearAppCache(): Promise<CacheResult> {
  const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
  const worker = registration?.active

  if (worker) {
    return new Promise<CacheResult>((resolve) => {
      const channel = new MessageChannel()
      const timer = setTimeout(() => resolve({ ok: false, precached: 0 }), CACHE_TIMEOUT_MS)
      channel.port1.onmessage = (event: MessageEvent<CacheResult>) => {
        clearTimeout(timer)
        resolve(event.data)
      }
      worker.postMessage({ type: 'CLEAR_CACHE' }, [channel.port2])
    })
  }

  if (typeof caches === 'undefined') return { ok: false, precached: 0 }
  const keys = await caches.keys()
  await Promise.all(keys.map((k) => caches.delete(k)))
  return { ok: true, precached: 0 }
}
