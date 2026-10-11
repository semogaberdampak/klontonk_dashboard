<script setup lang="ts">
// Nama (opsional tebal) dengan keterangan kecil di bawahnya: sel tabel yang paling sering dipakai.
defineProps<{ main?: string | number | null; sub?: string | number | null; strong?: boolean }>()
</script>

<template>
  <span v-if="strong" class="cell-strong">{{ main }}</span>
  <template v-else>{{ main }}</template>
  <span v-if="sub" class="cell-sub">{{ sub }}</span>
</template>
