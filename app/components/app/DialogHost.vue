<script setup lang="ts">
const { active, close } = useDialog()
</script>

<template>
  <ModalConfirm v-if="active?.kind === 'confirm'" :options="active.options" @close="close" />
  <ModalForm v-else-if="active?.kind === 'form'" :spec="active.spec" @close="close" />
</template>
