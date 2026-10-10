import { useCallback, useEffect, useState } from 'react'
import { DEMO_MODE, SUPABASE_URL } from '@/config'

export interface ConnectionState {
  state: 'idle' | 'ok' | 'bad'
  text: string
}

const CHECK_TIMEOUT_MS = 12_000

/** Status koneksi ke Supabase untuk sidebar. */
export function useConnection(): ConnectionState {
  const [connection, setConnection] = useState<ConnectionState>({ state: 'idle', text: 'Memeriksa koneksi...' })

  const check = useCallback(async () => {
    if (DEMO_MODE) {
      setConnection({ state: 'idle', text: 'Mode demo (data contoh)' })
      return
    }
    const mulai = Date.now()
    try {
      // mode 'no-cors': cukup tahu server menjawab, isi jawaban tidak dibaca.
      await fetch(`${SUPABASE_URL}/auth/v1/health`, {
        mode: 'no-cors',
        cache: 'no-store',
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS)
      })
      setConnection({ state: 'ok', text: `Tersambung · ${Date.now() - mulai} ms` })
    } catch {
      setConnection({ state: 'bad', text: 'Supabase tidak terjangkau' })
    }
  }, [])

  useEffect(() => {
    void check()
    const onOffline = () => setConnection({ state: 'bad', text: 'Tidak ada koneksi' })
    window.addEventListener('online', check)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', check)
      window.removeEventListener('offline', onOffline)
    }
  }, [check])

  return connection
}
