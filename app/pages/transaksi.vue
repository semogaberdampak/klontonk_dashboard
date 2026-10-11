<script setup lang="ts">
const { filters, state, draft, apply, clear, goPage, changeClient, exportCsv, api } = useTransaksiController()

const columns = [
  { key: 'waktu', label: 'Waktu' },
  { key: 'no', label: 'No. transaksi' },
  { key: 'cabang', label: 'Cabang' },
  { key: 'kasir', label: 'Kasir' },
  { key: 'metode', label: 'Metode' },
  { key: 'total', label: 'Total', align: 'num' as const },
  { key: 'dibayar', label: 'Dibayar', align: 'num' as const },
  { key: 'kembali', label: 'Kembali', align: 'num' as const }
]

const opsiCabang = computed(() => api.value.tenantOptions({ clientId: filters.value.client || null, includeAll: true, withClient: !filters.value.client }))
const namaCabang = computed(() => (filters.value.tenant ? (api.value.tenant(filters.value.tenant)?.name ?? '') : ''))
</script>

<template>
  <FilterBar clearable @submit="apply" @clear="clear">
    <FieldSelect id="ftClient" :model-value="draft.client" label="Client" :options="api.clientOptions({ includeAll: true })" @update:model-value="changeClient" />
    <FieldSelect id="ftCabang" v-model="draft.tenant" label="Cabang" :options="opsiCabang" />
    <FieldInput id="ftDari" v-model="draft.dari" label="Dari tanggal" type="date" />
    <FieldInput id="ftSampai" v-model="draft.sampai" label="Sampai tanggal" type="date" />
    <FieldSelect id="ftMetode" v-model="draft.metode" label="Metode" :options="METODE_OPTIONS" />
    <FieldInput id="ftCari" v-model="draft.cari" label="Cari no. / kasir" placeholder="cth: TRX-2026" />
    <template #trailing><button type="button" class="btn btn-secondary" @click="exportCsv">Unduh CSV</button></template>
  </FilterBar>

  <UiResource v-slot="{ data }" :state="state">
    <UiStatGrid>
      <UiStat label="Transaksi (filter)" :value="formatNumber(data.total)" />
      <UiStat label="Total di halaman ini" :value="formatRupiah(data.rows.reduce((t, r) => t + toNumber(r.total), 0))" :note="`${formatNumber(data.rows.length)} baris terlihat`" />
      <UiStat label="Periode" :value="`${filters.dari || 'awal'} sd ${filters.sampai || 'sekarang'}`" note="waktu Asia/Jakarta" />
    </UiStatGrid>
    <UiCard title="Riwayat penjualan" :hint="namaCabang ? `Cabang: ${namaCabang}. Data hanya bisa dibaca.` : 'Data hanya bisa dibaca -- penjualan dicatat lewat kasir di POS.'">
      <UiDataTable :columns="columns" :rows="data.rows" :row-key="(r) => `${r.tenant_id}/${r.no}`" empty="Tidak ada transaksi pada periode/filter ini.">
        <template #cell-waktu="{ row }">{{ formatDateTime(row.at) }}</template>
        <template #cell-no="{ row }"><UiMono>{{ row.no }}</UiMono></template>
        <template #cell-cabang="{ row }"><UiCellStack :main="row.tenant?.name ?? row.tenant_id" :sub="row.tenant ? api.clientName(row.tenant.client_id) : '-'" /></template>
        <template #cell-kasir="{ row }">{{ row.cashier }}</template>
        <template #cell-metode="{ row }"><UiBadge :tone="row.method === 'tunai' ? '' : 'info'">{{ row.method === 'tunai' ? 'Tunai' : 'Non-tunai' }}</UiBadge></template>
        <template #cell-total="{ row }">{{ formatRupiah(row.total) }}</template>
        <template #cell-dibayar="{ row }">{{ formatRupiah(row.paid) }}</template>
        <template #cell-kembali="{ row }">{{ formatRupiah(row.method === 'tunai' ? toNumber(row.paid) - toNumber(row.total) : 0) }}</template>
      </UiDataTable>
      <UiPager :total="data.total" :limit="TRANSAKSI_LIMIT" :offset="filters.offset" @go="goPage" />
    </UiCard>
  </UiResource>
</template>
