// Konfigurasi build-time Nuxt 4. Nilai per-lingkungan ada di runtimeConfig (bisa ditimpa lewat
// NUXT_PUBLIC_*), bukan di sini. Aplikasi berjalan sebagai SPA statis (ssr: false) karena seluruh
// data dan login ada di Supabase dan diakses langsung dari browser.
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  ssr: false,
  devtools: { enabled: false },

  css: ['~/assets/css/styles.css'],

  // Controller (composable per halaman) dan fungsi murni di lib/ tidak perlu di-import manual.
  imports: { dirs: ['lib', 'composables/controllers'] },

  // URL lama tetap sama: #/klien?cari=...
  router: { options: { hashMode: true } },

  runtimeConfig: {
    public: {
      // Kedua nilai di bawah PUBLIK (publishable key) dan memang untuk dipasang di aplikasi web:
      // keamanan data dijaga oleh RLS di database (db/dashboard-schema.sql), bukan kerahasiaan kunci.
      // JANGAN pernah mengisi kunci "secret" / "service_role". Timpa lewat NUXT_PUBLIC_SUPABASE_URL
      // dan NUXT_PUBLIC_SUPABASE_KEY (lihat .env.example).
      supabaseUrl: 'https://bxynoilzdiqjiepdewnp.supabase.co',
      supabaseKey: 'sb_publishable_biqV-ZAK0T0B43KKyoQgSw_VOjb-GhC',
      // Mode demo: data contoh tanpa Supabase dan tanpa login (NUXT_PUBLIC_DEMO_MODE=true).
      demoMode: false
    }
  },

  app: {
    head: {
      htmlAttrs: { lang: 'id', 'data-theme': 'light' },
      title: 'Klontonk Dashboard',
      meta: [
        { name: 'description', content: 'Dashboard manajemen Klontonk POS: client, cabang, langganan, pengguna, dan log.' },
        { name: 'theme-color', content: '#0F172A' }
      ],
      link: [
        { rel: 'manifest', href: '/manifest.json' },
        {
          rel: 'icon',
          href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230F172A'/%3E%3Ctext x='16' y='22' font-family='sans-serif' font-size='17' font-weight='700' fill='white' text-anchor='middle'%3EK%3C/text%3E%3C/svg%3E"
        }
      ]
    }
  },

  typescript: {
    strict: true,
    tsConfig: { compilerOptions: { noUnusedLocals: true, noUnusedParameters: true } }
  }
})
