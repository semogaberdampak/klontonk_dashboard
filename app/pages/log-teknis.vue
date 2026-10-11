<script setup lang="ts">
const { filters, state, draft, apply, clear, goPage, changeClient, exportCsv, detail, api } = useLogTeknisController()

const columns = [
  { key: 'waktu', label: 'Waktu' },
  { key: 'level', label: 'Level' },
  { key: 'sumber', label: 'Sumber' },
  { key: 'pesan', label: 'Pesan' },
  { key: 'lokasi', label: 'Cabang / client' },
  { key: 'versi', label: 'Versi / perangkat' },
  { key: 'detail', label: '', align: 'num' as const }
]

const opsiCabang = computed(() => api.value.tenantOptions({ clientId: filters.value.client || null, includeAll: true, withClient: !filters.value.client }))

function lokasi(row: { tenant_id: string | null; client_id: string | null }): string {
  const bagian: string[] = []
  if (row.tenant_id) bagian.push(api.value.tenant(row.tenant_id)?.name ?? row.tenant_id)
  if (row.client_id) bagian.push(api.value.clientName(row.client_id))
  return bagian.join(' - ') || '-'
}
</script>

<template>
  <FilterBar clearable @submit="apply" @clear="clear">
    <FieldSelect id="feLevel" v-model="draft.level" label="Level" :options="LEVEL_OPTIONS" />
    <FieldSelect id="feClient" :model-value="draft.client" label="Client" :options="api.clientOptions({ includeAll: true })" @update:model-value="changeClient" />
    <FieldSelect id="feCabang" v-model="draft.tenant" label="Cabang" :options="opsiCabang" />
    <FieldInput id="feCari" v-model="draft.cari" label="Cari pesan" placeholder="cth: gagal simpan" />
    <FieldInput id="feDari" v-model="draft.dari" label="Dari" type="date" />
    <FieldInput id="feSampai" v-model="draft.sampai" label="Sampai" type="date" />
    <template #trailing><button type="button" class="btn btn-secondary" @click="exportCsv">Unduh CSV</button></template>
  </FilterBar>

  <UiResource v-slot="{ data }" :state="state">
    <UiStatGrid>
      <UiStat label="Error" :value="formatNumber(data.hitung.error)" :tone="data.hitung.error ? 'danger' : 'success'" />
      <UiStat label="Peringatan" :value="formatNumber(data.hitung.warn)" :tone="data.hitung.warn ? 'warning' : ''" />
      <UiStat label="Info" :value="formatNumber(data.hitung.info)" />
    </UiStatGrid>
    <UiCard title="Log teknis dari perangkat client" hint="Dikirim aplikasi POS lewat rpc(report_event). Belum otomatis -- lihat README bagian integrasi POS.">
      <UiDataTable :columns="columns" :rows="data.rows" :row-key="(r, i) => `${r.at}/${i}`" empty="Tidak ada log teknis pada periode/filter ini.">
        <template #cell-waktu="{ row }"><UiCellStack :main="relTime(row.at)" :sub="formatDateTime(row.at)" /></template>
        <template #cell-level="{ row }"><UiBadge :tone="levelTone(row.level)">{{ row.level.toUpperCase() }}</UiBadge></template>
        <template #cell-sumber="{ row }">{{ row.source }}</template>
        <template #cell-pesan="{ row }"><span class="detail-cell">{{ row.message }}</span></template>
        <template #cell-lokasi="{ row }">{{ lokasi(row) }}</template>
        <template #cell-versi="{ row }"><UiCellStack :main="row.app_version || '-'" :sub="row.device" /></template>
        <template #cell-detail="{ row }"><UiRowActions :buttons="[{ label: 'Detail', onClick: () => detail(row) }]" /></template>
      </UiDataTable>
      <UiPager :total="data.total" :limit="TEKNIS_LIMIT" :offset="filters.offset" @go="goPage" />
    </UiCard>
  </UiResource>
</template>
