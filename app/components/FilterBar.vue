<script setup lang="ts">
// Bar filter: kolom isian di slot utama, tombol sisi kanan (Tambah / Unduh CSV) di slot `trailing`.
defineProps<{ clearable?: boolean }>()
const emit = defineEmits<{ submit: []; clear: [] }>()
</script>

<template>
  <form class="filters" @submit.prevent="emit('submit')">
    <slot />
    <button type="submit" class="btn btn-primary">Terapkan</button>
    <button v-if="clearable" type="button" class="btn btn-secondary" @click="emit('clear')">Bersihkan</button>
    <span v-if="$slots.trailing" style="margin-left: auto; display: flex; gap: 8px"><slot name="trailing" /></span>
  </form>
</template>
