<script setup lang="ts">
withDefaults(defineProps<{ text?: string }>(), { text: 'Memuat data...' })
</script>

<template>
  <div class="loading">
    <span class="spinner" />{{ text }}
  </div>
</template>
