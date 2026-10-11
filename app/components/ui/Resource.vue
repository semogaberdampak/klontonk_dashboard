<script setup lang="ts" generic="T">
import type { ResourceState } from '~/composables/useResource'

// Tampilkan Loading / ErrorBox sesuai status, atau isi halaman (slot) bila data siap.
defineProps<{ state: ResourceState<T> }>()
defineSlots<{ default(props: { data: T }): unknown }>()
</script>

<template>
  <UiLoading v-if="state.status === 'loading'" />
  <UiErrorBox v-else-if="state.status === 'error'" :message="state.message" />
  <slot v-else :data="state.data" />
</template>
