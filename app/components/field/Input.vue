<script setup lang="ts">
withDefaults(defineProps<{ id: string; label: string; type?: 'search' | 'date' | 'text'; placeholder?: string; grow?: boolean }>(), {
  type: 'search'
})
const model = defineModel<string>({ required: true })
</script>

<template>
  <div :class="['field', { grow }]">
    <label :for="id">{{ label }}</label>
    <input :id="id" v-model="model" :type="type" :placeholder="placeholder" />
  </div>
</template>
