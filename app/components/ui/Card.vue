<script setup lang="ts">
defineProps<{ title?: string; hint?: string }>()
</script>

<template>
  <section class="card">
    <div v-if="title" class="card-head">
      <div>
        <h2>{{ title }}</h2>
        <p v-if="hint" class="hint">{{ hint }}</p>
      </div>
    </div>
    <slot />
  </section>
</template>
