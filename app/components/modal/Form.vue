<script setup lang="ts">
import type { FormField, FormSpec, FormValues } from '~/models/formTypes'

const props = defineProps<{ spec: FormSpec }>()
const emit = defineEmits<{ close: [saved: boolean] }>()

const toText = (value: string | number | boolean | null | undefined): string =>
  value === null || value === undefined || typeof value === 'boolean' ? '' : String(value)

const values = reactive<FormValues>(
  Object.fromEntries(
    props.spec.fields.map((field): [string, string | boolean] => {
      const nilai = props.spec.values?.[field.name]
      return [field.name, field.type === 'checkbox' ? Boolean(nilai) : toText(nilai)]
    })
  )
)
const error = ref<string | null>(null)
const busy = ref(false)
const dialog = ref<HTMLElement | null>(null)

/** Pasangkan field `half` yang berurutan menjadi satu baris. */
const rows = computed<FormField[][]>(() => {
  const hasil: FormField[][] = []
  const fields = props.spec.fields
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    const next = fields[i + 1]
    if (!field) continue
    if (field.half && next?.half) {
      hasil.push([field, next])
      i++
    } else {
      hasil.push([field])
    }
  }
  return hasil
})

const text = (name: string): string => {
  const value = values[name]
  return typeof value === 'string' ? value : ''
}
const setText = (name: string, value: string): void => {
  values[name] = value
}

async function submit(): Promise<void> {
  error.value = null
  const trimmed: FormValues = {}
  for (const field of props.spec.fields) {
    const nilai = values[field.name]
    trimmed[field.name] = typeof nilai === 'string' ? nilai.trim() : Boolean(nilai)
  }
  for (const field of props.spec.fields) {
    if (field.required && field.type !== 'checkbox' && !trimmed[field.name]) {
      error.value = `${field.label} wajib diisi.`
      return
    }
  }

  busy.value = true
  try {
    const result = await props.spec.onSubmit(trimmed)
    if (result.success) emit('close', true)
    else error.value = result.error || 'Gagal menyimpan. Coba lagi.'
  } catch {
    error.value = 'Terjadi kesalahan. Coba lagi.'
  } finally {
    busy.value = false
  }
}

const onKey = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') emit('close', false)
}
onMounted(() => {
  dialog.value?.querySelector<HTMLElement>('input, select, textarea')?.focus()
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="modal-root visible" aria-hidden="false">
    <div class="modal-backdrop" @click="emit('close', false)" />
    <div ref="dialog" :class="['modal-dialog', { wide: spec.wide }]" role="dialog" aria-modal="true">
      <h2 class="modal-title">{{ spec.title }}</h2>
      <p v-if="spec.note" class="hint">{{ spec.note }}</p>
      <form class="modal-form" autocomplete="off" novalidate @submit.prevent="submit">
        <template v-for="baris in rows" :key="baris.map((f) => f.name).join('+')">
          <div :class="baris.length === 2 ? 'form-row' : undefined" :style="baris.length === 2 ? undefined : 'display: contents'">
            <div v-for="field in baris" :key="field.name" :class="['field', { grow: !field.half || field.type === 'checkbox' }]">
              <template v-if="field.type === 'checkbox'">
                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px">
                  <input :id="`fm_${field.name}`" v-model="values[field.name]" type="checkbox" :name="field.name" />
                  <span>{{ field.label }}</span>
                </label>
              </template>
              <template v-else>
                <label :for="`fm_${field.name}`">{{ field.label }}{{ field.required ? ' *' : '' }}</label>
                <select
                  v-if="field.type === 'select'"
                  :id="`fm_${field.name}`"
                  :name="field.name"
                  :required="field.required"
                  :value="text(field.name)"
                  @change="setText(field.name, ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="option in field.options ?? []" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <textarea
                  v-else-if="field.type === 'textarea'"
                  :id="`fm_${field.name}`"
                  :name="field.name"
                  rows="3"
                  :required="field.required"
                  :placeholder="field.placeholder"
                  :maxlength="field.maxlength"
                  :value="text(field.name)"
                  @input="setText(field.name, ($event.target as HTMLTextAreaElement).value)"
                />
                <input
                  v-else
                  :id="`fm_${field.name}`"
                  :type="field.type ?? 'text'"
                  :name="field.name"
                  :required="field.required"
                  :placeholder="field.placeholder"
                  :min="field.min"
                  :max="field.max"
                  :maxlength="field.maxlength"
                  :value="text(field.name)"
                  @input="setText(field.name, ($event.target as HTMLInputElement).value)"
                />
              </template>
              <span v-if="field.hint" class="hint">{{ field.hint }}</span>
            </div>
          </div>
        </template>
      </form>
      <div v-if="error" class="form-error">{{ error }}</div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" @click="emit('close', false)">Batal</button>
        <button type="button" class="btn btn-primary" :disabled="busy" :aria-busy="busy || undefined" @click="submit">
          {{ spec.submitText ?? 'Simpan' }}
        </button>
      </div>
    </div>
  </div>
</template>
