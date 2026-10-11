<script setup lang="ts">
import type { StatTone } from '~/models/uiTypes'

defineProps<{ label: string; value: string; note?: string; tone?: StatTone }>()
</script>

<template>
  <div class="stat" :data-tone="tone || undefined">
    <div class="stat-label">{{ label }}</div>
    <div class="stat-value">{{ value }}</div>
    <div v-if="note" class="stat-note">{{ note }}</div>
  </div>
</template>
