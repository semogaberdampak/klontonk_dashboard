<script setup lang="ts">
const route = useRoute()
const { ready, refresh } = useLookups()
const meta = computed(() => routeFor(route.path))

useHead({ title: computed(() => `${meta.value?.title ?? 'Klontonk Dashboard'} - Klontonk Dashboard`) })

// Halaman dirender setelah daftar acuan (klien, paket, cabang) siap.
onMounted(() => {
  if (!ready.value) void refresh()
})
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <div class="content">
      <AppTopbar :title="meta?.title ?? 'Klontonk Dashboard'" :subtitle="meta?.subtitle ?? ''" />
      <main class="main" role="main">
        <slot v-if="ready" />
        <UiLoading v-else />
      </main>
    </div>
  </div>
</template>
