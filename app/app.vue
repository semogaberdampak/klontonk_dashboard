<script setup lang="ts">
const { status } = useAuth()
const { reset } = useLookups()

// Keluar atau sesi berakhir -> bersihkan daftar acuan dan kembali ke halaman login.
watch(status, (value) => {
  if (value !== 'anonymous') return
  reset()
  if (useRoute().path !== '/login') void navigateTo('/login')
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AppToastHost />
  <AppDialogHost />
</template>
