<script setup lang="ts">
const { items } = useToast()
const MARKS = { info: 'i', success: 'v', warning: '!', danger: 'x' } as const
</script>

<template>
  <div class="toast-root" aria-live="polite" aria-atomic="true">
    <div v-for="item in items" :key="item.id" :class="['toast', item.type, { hiding: item.hiding }]" role="status">
      <span style="font-weight: 700">{{ MARKS[item.type] }}</span>
      <span style="flex: 1">{{ item.message }}</span>
    </div>
  </div>
</template>
