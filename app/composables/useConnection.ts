export interface ConnectionState {
  state: 'idle' | 'ok' | 'bad'
  text: string
}

const CHECK_TIMEOUT_MS = 12_000

/** Status koneksi ke Supabase untuk sidebar. */
export function useConnection() {
  const connection = ref<ConnectionState>({ state: 'idle', text: 'Memeriksa koneksi...' })
  const config = useRuntimeConfig().public

  const check = async (): Promise<void> => {
    if (config.demoMode === true || String(config.demoMode) === 'true') {
      connection.value = { state: 'idle', text: 'Mode demo (data contoh)' }
      return
    }
    const mulai = Date.now()
    try {
      // mode 'no-cors': cukup tahu server menjawab, isi jawaban tidak dibaca.
      await fetch(`${config.supabaseUrl}/auth/v1/health`, {
        mode: 'no-cors',
        cache: 'no-store',
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS)
      })
      connection.value = { state: 'ok', text: `Tersambung · ${Date.now() - mulai} ms` }
    } catch {
      connection.value = { state: 'bad', text: 'Supabase tidak terjangkau' }
    }
  }

  const onOffline = (): void => {
    connection.value = { state: 'bad', text: 'Tidak ada koneksi' }
  }

  onMounted(() => {
    void check()
    window.addEventListener('online', check)
    window.addEventListener('offline', onOffline)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('online', check)
    window.removeEventListener('offline', onOffline)
  })

  return connection
}
