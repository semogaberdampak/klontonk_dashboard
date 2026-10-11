<script setup lang="ts" generic="T">
import type { Column } from '~/models/uiTypes'

// Kolom didefinisikan lewat `columns`; isi tiap sel lewat slot bernama `cell-{key}`.
// Tanpa slot, nilai row[key] yang ditampilkan ("-" bila kosong).
defineProps<{
  columns: readonly Column[]
  rows: readonly T[]
  rowKey: (row: T, index: number) => string | number
  empty?: string
}>()
defineSlots<Record<`cell-${string}`, (props: { row: T; index: number }) => unknown>>()

const fallback = (row: T, key: string): string => {
  const value = (row as Record<string, unknown>)[key]
  return value === null || value === undefined || value === '' ? '-' : String(value)
}
</script>

<template>
  <div v-if="!rows.length" class="empty">{{ empty ?? 'Belum ada data.' }}</div>
  <div v-else class="table-wrap">
    <table>
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key" :class="column.align">{{ column.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="rowKey(row, index)">
          <td v-for="column in columns" :key="column.key" :class="column.align">
            <slot :name="`cell-${column.key}`" :row="row" :index="index">{{ fallback(row, column.key) }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
