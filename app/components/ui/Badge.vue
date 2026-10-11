<script setup lang="ts">
import type { Tone } from '~/models/uiTypes'

defineProps<{ tone?: Tone }>()
</script>

<template>
  <span class="badge" :data-tone="tone || undefined"><slot /></span>
</template>
