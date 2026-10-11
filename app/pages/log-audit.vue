<script setup lang="ts">
const { filters, state, draft, apply, clear, goPage, changeClient, exportCsv, detail, api } = useLogAuditController()

const columns = [
  { key: 'waktu', label: 'Waktu' },
  { key: 'pelaku', label: 'Pelaku' },
  { key: 'aksi', label: 'Aksi' },
  { key: 'objek', label: 'Objek' },
  { key: 'lokasi', label: 'Cabang / client' },
  { key: 'rincian', label: 'Rincian' },
  { key: 'detail', label: '', align: 'num' as const }
]

const opsiCabang = computed(() => api.value.tenantOptions({ clientId: filters.value.client || null, includeAll: true, withClient: !filters.value.client }))

function lokasi(row: { tenant_id: string | null; client_id: string | null }): string {
  const bagian: string[] = []
  if (row.tenant_id) {
    const t = api.value.tenant(row.tenant_id)
    bagian.push(t ? `${t.name} (${row.tenant_id})` : row.tenant_id)
  }
  if (row.client_id) bagian.push(api.value.clientName(row.client_id))
  return bagian.join(' - ') || '-'
}
</script>

<template>
  <FilterBar clearable @submit="apply" @clear="clear">
    <FieldSelect id="faClient" :model-value="draft.client" label="Client" :options="api.clientOptions({ includeAll: true })" @update:model-value="changeClient" />
    <FieldSelect id="faCabang" v-model="draft.tenant" label="Cabang" :options="opsiCabang" />
    <FieldSelect id="faAksi" v-model="draft.aksi" label="Aksi" :options="AKSI_OPTIONS" />
    <FieldInput id="faPelaku" v-model="draft.pelaku" label="Pelaku" placeholder="cth: Budi" />
    <FieldInput id="faDari" v-model="draft.dari" label="Dari" type="date" />
    <FieldInput id="faSampai" v-model="draft.sampai" label="Sampai" type="date" />
    <template #trailing><button type="button" class="btn btn-secondary" @click="exportCsv">Unduh CSV</button></template>
  </FilterBar>

  <UiResource v-slot="{ data }" :state="state">
    <UiStatGrid>
      <UiStat label="Baris log (filter)" :value="formatNumber(data.total)" />
      <UiStat label="Periode" :value="`${filters.dari || 'awal'} sd ${filters.sampai || 'sekarang'}`" note="default 7 hari terakhir" />
      <UiStat label="Halaman" :value="`${formatNumber(data.rows.length)} baris`" />
    </UiStatGrid>
    <UiCard title="Log audit" hint="Termasuk perubahan stok/harga oleh kasir, penjualan, retur, dan akun. Tidak bisa disunting atau dihapus.">
      <UiDataTable :columns="columns" :rows="data.rows" :row-key="(r, i) => `${r.at}/${i}`" empty="Tidak ada aktivitas pada periode/filter ini.">
        <template #cell-waktu="{ row }"><UiCellStack :main="relTime(row.at)" :sub="formatDateTime(row.at)" /></template>
        <template #cell-pelaku="{ row }"><UiCellStack :main="row.actor_name || '-'" :sub="row.actor_role" /></template>
        <template #cell-aksi="{ row }"><UiBadge :tone="toneAksi(row.action)">{{ row.action }}</UiBadge></template>
        <template #cell-objek="{ row }"><UiCellStack :main="row.entity" :sub="row.entity_id" /></template>
        <template #cell-lokasi="{ row }">{{ lokasi(row) }}</template>
        <template #cell-rincian="{ row }"><span class="detail-cell">{{ prettyDetail(row.detail) }}</span></template>
        <template #cell-detail="{ row }"><UiRowActions :buttons="[{ label: 'Detail', onClick: () => detail(row) }]" /></template>
      </UiDataTable>
      <UiPager :total="data.total" :limit="AUDIT_LIMIT" :offset="filters.offset" @go="goPage" />
    </UiCard>
  </UiResource>
</template>
