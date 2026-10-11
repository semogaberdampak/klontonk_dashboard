<script setup lang="ts">
import type { ConfirmOptions } from '~/models/formTypes'

const props = defineProps<{ options: ConfirmOptions }>()
const emit = defineEmits<{ close: [confirmed: boolean] }>()

const title = computed(() => props.options.title ?? 'Pemberitahuan')
const confirmText = computed(() => props.options.confirmText ?? 'OK')
const cancelText = computed(() => props.options.cancelText ?? null)
// Menutup lewat Escape/latar: pemberitahuan (tanpa tombol batal) dianggap "OK".
const dismissValue = computed(() => !cancelText.value)

const confirmButton = ref<HTMLButtonElement | null>(null)
const onKey = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') emit('close', dismissValue.value)
}

onMounted(() => {
  confirmButton.value?.focus()
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="modal-root visible" aria-hidden="false">
    <div class="modal-backdrop" @click="emit('close', dismissValue)" />
    <div class="modal-dialog" role="alertdialog" aria-modal="true">
      <h2 class="modal-title">{{ title }}</h2>
      <div class="modal-body">{{ options.message ?? '' }}</div>
      <div class="modal-actions">
        <button v-if="cancelText" type="button" class="btn btn-secondary" @click="emit('close', false)">{{ cancelText }}</button>
        <button
          ref="confirmButton"
          type="button"
          :class="`btn btn-${options.variant === 'danger' ? 'danger' : 'primary'}`"
          @click="emit('close', true)"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
