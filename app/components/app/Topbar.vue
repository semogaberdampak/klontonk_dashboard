<script setup lang="ts">
defineProps<{ title: string; subtitle: string }>()

const { admin, logout } = useAuth()
const { refresh } = useLookups()
const { reload } = useReload()
const dialog = useDialog()
const name = computed(() => admin.value?.name || 'Admin')

async function onRefresh(): Promise<void> {
  await refresh()
  reload()
}

async function onLogout(): Promise<void> {
  const yakin = await dialog.confirm({
    title: 'Keluar',
    message: 'Keluar dari dashboard sekarang?',
    confirmText: 'Ya, Keluar',
    cancelText: 'Batal',
    variant: 'danger'
  })
  if (yakin) await logout()
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-title">
      <h1>{{ title }}</h1>
      <p class="muted">{{ subtitle }}</p>
    </div>
    <div class="topbar-actions">
      <button type="button" class="btn btn-ghost" title="Muat ulang data halaman ini" @click="onRefresh">Muat ulang</button>
      <div class="user-chip"><span class="avatar">{{ initialOf(name) }}</span><span>{{ name }}</span></div>
      <button type="button" class="btn btn-ghost danger" @click="onLogout">Keluar</button>
    </div>
  </header>
</template>
