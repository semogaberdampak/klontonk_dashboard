<script setup lang="ts">
const props = defineProps<{ total: number; limit: number; offset: number }>()
const emit = defineEmits<{ go: [offset: number] }>()

const dari = computed(() => (props.total === 0 ? 0 : props.offset + 1))
const sampai = computed(() => Math.min(props.offset + props.limit, props.total))
const halaman = computed(() => Math.floor(props.offset / props.limit) + 1)
const totalHalaman = computed(() => Math.max(1, Math.ceil(props.total / props.limit)))
</script>

<template>
  <div class="pager">
    <span>
      Menampilkan <strong>{{ formatNumber(dari) }}-{{ formatNumber(sampai) }}</strong> dari
      <strong>{{ formatNumber(total) }}</strong> baris
    </span>
    <span class="group">
      <button type="button" class="btn btn-secondary btn-sm" :disabled="offset <= 0" @click="emit('go', Math.max(0, offset - limit))">
        Sebelumnya
      </button>
      <span>Halaman {{ halaman }} / {{ totalHalaman }}</span>
      <button type="button" class="btn btn-secondary btn-sm" :disabled="sampai >= total" @click="emit('go', offset + limit)">
        Berikutnya
      </button>
    </span>
  </div>
</template>
