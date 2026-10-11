<script setup lang="ts">
import type { Option } from '~/lib/lookups'

defineProps<{ id: string; label: string; options: readonly Option[]; grow?: boolean }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <div :class="['field', { grow }]">
    <label :for="id">{{ label }}</label>
    <select :id="id" v-model="model">
      <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
  </div>
</template>
