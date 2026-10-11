<script setup lang="ts">
const { filters, state, draft, apply, clear, goPage, changeClient, exportCsv, api } = useReturController()

const columns = [
  { key: 'waktu', label: 'Waktu' },
  { key: 'no', label: 'No. retur' },
  { key: 'cabang', label: 'Cabang' },
  { key: 'jenis', label: 'Jenis' },
  { key: 'barang', label: 'Barang' },
  { key: 'jumlah', label: 'Jumlah', align: 'num' as const },
  { key: 'nilai', label: 'Nilai', align: 'num' as const },
  { key: 'alasan', label: 'Alasan' },
  { key: 'kasir', label: 'Kasir' },
  { key: 'catatan', label: 'Catatan' }
]

const opsiCabang = computed(() => api.value.tenantOptions({ clientId: filters.value.client || null, includeAll: true, withClient: !filters.value.client }))
</script>

<template>
  <FilterBar clearable @submit="apply" @clear="clear">
    <FieldSelect id="frClient" :model-value="draft.client" label="Client" :options="api.clientOptions({ includeAll: true })" @update:model-value="changeClient" />
    <FieldSelect id="frCabang" v-model="draft.tenant" label="Cabang" :options="opsiCabang" />
    <FieldInput id="frDari" v-model="draft.dari" label="Dari tanggal" type="date" />
    <FieldInput id="frSampai" v-model="draft.sampai" label="Sampai tanggal" type="date" />
    <FieldSelect id="frJenis" v-model="draft.jenis" label="Jenis" :options="JENIS_OPTIONS" />
    <FieldSelect id="frAlasan" v-model="draft.alasan" label="Alasan" :options="ALASAN_OPTIONS" />
    <FieldInput id="frCari" v-model="draft.cari" label="Cari no. / barang / kasir" placeholder="cth: RTR-2026" />
    <template #trailing><button type="button" class="btn btn-secondary" @click="exportCsv">Unduh CSV</button></template>
  </FilterBar>

  <UiResource v-slot="{ data }" :state="state">
    <UiStatGrid>
      <UiStat label="Retur (filter)" :value="formatNumber(data.total)" />
      <UiStat label="Baris di halaman ini" :value="formatNumber(data.rows.length)" />
      <UiStat label="Total nilai di halaman" :value="formatRupiah(data.rows.reduce((t, r) => t + toNumber(r.amount), 0))" :note="`${formatNumber(data.rows.reduce((t, r) => t + toNumber(r.qty), 0))} unit`" />
    </UiStatGrid>
    <UiCard title="Riwayat retur" hint="Data hanya bisa dibaca -- retur dicatat lewat aplikasi POS.">
      <UiDataTable :columns="columns" :rows="data.rows" :row-key="(r) => `${r.tenant_id}/${r.no}/${r.item_id}`" empty="Tidak ada retur pada periode/filter ini.">
        <template #cell-waktu="{ row }">{{ formatDateTime(row.at) }}</template>
        <template #cell-no="{ row }"><UiMono>{{ row.no }}</UiMono></template>
        <template #cell-cabang="{ row }"><UiCellStack :main="row.tenant?.name ?? row.tenant_id" :sub="row.tenant ? api.clientName(row.tenant.client_id) : '-'" /></template>
        <template #cell-jenis="{ row }"><UiBadge :tone="row.kind === 'pelanggan' ? 'ok' : 'warn'">{{ row.kind === 'pelanggan' ? 'Dari pelanggan' : 'Ke supplier' }}</UiBadge></template>
        <template #cell-barang="{ row }"><UiCellStack :main="row.name" :sub="row.item_id" /></template>
        <template #cell-jumlah="{ row }">{{ formatNumber(row.qty) }} {{ row.unit }}</template>
        <template #cell-nilai="{ row }">{{ formatRupiah(row.amount) }}</template>
        <template #cell-alasan="{ row }">{{ LABEL_ALASAN[row.reason] ?? row.reason }}</template>
        <template #cell-kasir="{ row }">{{ row.cashier }}</template>
        <template #cell-catatan="{ row }">{{ row.note || '-' }}</template>
      </UiDataTable>
      <UiPager :total="data.total" :limit="RETUR_LIMIT" :offset="filters.offset" @go="goPage" />
    </UiCard>
  </UiResource>
</template>
