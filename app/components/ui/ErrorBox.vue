<script setup lang="ts">
withDefaults(defineProps<{ message: string; title?: string }>(), { title: 'Gagal memuat data' })
</script>

<template>
  <div class="card">
    <div class="card-head"><h2>{{ title }}</h2></div>
    <p class="muted">{{ message }}</p>
    <p class="hint">Periksa koneksi internet, lalu tekan "Muat ulang" di kanan atas.</p>
  </div>
</template>
