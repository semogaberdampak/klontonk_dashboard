// Penjaga akses: hanya admin platform yang sudah login boleh membuka halaman selain /login.
export default defineNuxtRouteMiddleware((to) => {
  const { status } = useAuth()
  const isLogin = to.path === '/login'

  if (status.value !== 'authenticated') return isLogin ? undefined : navigateTo('/login')
  if (isLogin) return navigateTo('/ringkasan')
})
