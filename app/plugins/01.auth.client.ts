// Pulihkan sesi login SEBELUM routing dimulai, supaya middleware tidak salah menganggap
// pengguna belum masuk (yang akan melempar admin ke halaman login setiap refresh).
export default defineNuxtPlugin(async () => {
  await useAuth().boot()
})
