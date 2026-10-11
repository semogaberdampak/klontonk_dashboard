<script setup lang="ts">
import type { RowButton } from '~/models/uiTypes'

// Baris tombol aksi di kolom kanan tabel. Entri false/null dilewati (untuk tombol bersyarat).
const props = defineProps<{ buttons: ReadonlyArray<RowButton | false | null | undefined> }>()
const active = computed(() => props.buttons.filter((b): b is RowButton => Boolean(b)))
</script>

<template>
  <div v-if="active.length" class="row-actions">
    <button
      v-for="button in active"
      :key="button.label"
      type="button"
      :class="`btn btn-${button.tone ?? 'ghost'} btn-sm`"
      :title="button.title"
      @click="button.onClick()"
    >
      {{ button.label }}
    </button>
  </div>
</template>
