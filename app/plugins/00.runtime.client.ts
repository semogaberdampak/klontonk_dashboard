import { setRuntimeSettings } from '~/config'

// Mengisi pengaturan runtime (URL/kunci Supabase, mode demo) sebelum ada permintaan data.
export default defineNuxtPlugin(() => {
  const { supabaseUrl, supabaseKey, demoMode } = useRuntimeConfig().public
  setRuntimeSettings({
    supabaseUrl: String(supabaseUrl ?? ''),
    supabaseKey: String(supabaseKey ?? ''),
    demoMode: demoMode === true || String(demoMode) === 'true'
  })
})
