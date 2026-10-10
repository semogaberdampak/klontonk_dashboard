import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const DEFAULT_SUPABASE_URL = 'https://bxynoilzdiqjiepdewnp.supabase.co'

// CSP hanya disuntik saat build produksi: server dev Vite memakai skrip inline (React Refresh)
// yang akan diblokir CSP ketat. Koneksi dibatasi ke Supabase milik project ini.
function contentSecurityPolicy(supabaseUrl: string): Plugin {
  const host = new URL(supabaseUrl).host
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    `connect-src 'self' https://${host} wss://${host}`,
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')

  return {
    name: 'klontonk-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }
    ]
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    base: './',
    plugins: [react(), contentSecurityPolicy(env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL)],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 5173, host: '127.0.0.1' },
    build: { outDir: 'dist', sourcemap: false },
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      coverage: { provider: 'v8', include: ['src/lib/**', 'src/models/**', 'src/hooks/**', 'src/components/**'], exclude: ['src/test/**', 'src/**/*.test.*'] }
    }
  }
})
