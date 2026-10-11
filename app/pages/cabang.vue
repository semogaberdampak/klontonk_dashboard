<script setup lang="ts">
const { filters, state, draft, apply, clear, goPage, go, api, tambah, ubah, hapus } = useCabangController()

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'cabang', label: 'Cabang' },
  { key: 'client', label: 'Client' },
  { key: 'pengguna', label: 'Pengguna', align: 'num' as const },
  { key: 'aksi', label: '', align: 'num' as const }
]
</script>

<template>
  <FilterBar clearable @submit="apply" @clear="clear">
    <FieldSelect id="fcClient" v-model="draft.client" label="Client" :options="api.clientOptions({ includeAll: true })" />
    <FieldInput id="fcCari" v-model="draft.cari" label="Cari nama cabang" grow placeholder="cth: cabang 2" />
    <template #trailing><button type="button" class="btn btn-primary" @click="tambah">+ Tambah cabang</button></template>
  </FilterBar>

  <UiResource v-slot="{ data }" :state="state">
    <UiStatGrid>
      <UiStat label="Cabang terdaftar" :value="formatNumber(api.data.tenants.length)" />
      <UiStat label="Client" :value="formatNumber(api.data.clients.length)" />
      <UiStat label="Hasil filter" :value="formatNumber(data.total)" />
    </UiStatGrid>
    <UiCard :title="`Daftar cabang (${formatNumber(data.total)})`" hint="ID cabang dipakai aplikasi POS sebagai penanda tenant.">
      <UiDataTable
        :columns="columns"
        :rows="data.rows"
        :row-key="(r) => r.id"
        :empty="filters.client || filters.cari ? 'Tidak ada cabang yang cocok dengan filter.' : 'Belum ada cabang. Tambahkan cabang pertama.'"
      >
        <template #cell-id="{ row }"><UiMono>{{ row.id }}</UiMono></template>
        <template #cell-cabang="{ row }"><span class="cell-strong">{{ row.name }}</span></template>
        <template #cell-client="{ row }"><UiCellStack :main="api.clientName(row.client_id)" :sub="row.client_id" /></template>
        <template #cell-pengguna="{ row }">{{ formatNumber(data.pengguna[row.id] ?? 0) }}</template>
        <template #cell-aksi="{ row }">
          <UiRowActions
            :buttons="[
              { label: 'Ubah nama', onClick: () => ubah(row) },
              { label: 'Pengguna', onClick: () => go('/pengguna', { client: row.client_id, tenant: row.id }) },
              { label: 'Hapus', onClick: () => hapus(row) }
            ]"
          />
        </template>
      </UiDataTable>
      <UiPager :total="data.total" :limit="CABANG_LIMIT" :offset="filters.offset" @go="goPage" />
    </UiCard>
  </UiResource>
</template>
