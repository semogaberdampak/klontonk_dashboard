// Menyuntik Content Security Policy ke halaman hasil `nuxt generate`.
//
// Nuxt menaruh satu skrip inline kecil (window.__NUXT__ = ...) di index.html, jadi `script-src 'self'`
// saja akan memblokirnya. Skrip ini menghitung hash SHA-256 tiap skrip inline lalu mengizinkan
// HANYA hash itu (tanpa 'unsafe-inline'). Koneksi dibatasi ke Supabase milik project ini.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUTPUT = '.output/public'
const PAGES = ['index.html', '200.html', '404.html']
const DEFAULT_SUPABASE_URL = 'https://bxynoilzdiqjiepdewnp.supabase.co'

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
const demoMode = process.env.NUXT_PUBLIC_DEMO_MODE === 'true'
const host = new URL(supabaseUrl).host

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g

function policyFor(html) {
  const hashes = [...html.matchAll(INLINE_SCRIPT)]
    .map((match) => match[1])
    .filter((body) => body.trim().length > 0)
    .map((body) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`)

  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    demoMode ? "connect-src 'self'" : `connect-src 'self' https://${host} wss://${host}`,
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
}

let patched = 0
for (const page of PAGES) {
  const path = join(OUTPUT, page)
  if (!existsSync(path)) continue
  const html = readFileSync(path, 'utf8')
  if (html.includes('http-equiv="Content-Security-Policy"')) continue
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policyFor(html)}">`
  writeFileSync(path, html.replace(/<head([^>]*)>/, `<head$1>${meta}`))
  patched += 1
}

if (!patched) {
  console.error(`[csp] Tidak ada halaman di ${OUTPUT} yang diperbarui. Jalankan "nuxt generate" lebih dulu.`)
  process.exit(1)
}
console.log(`[csp] Content-Security-Policy disuntik ke ${patched} halaman.`)
