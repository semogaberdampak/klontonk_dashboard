<script setup lang="ts">
const { filters, state, draft, apply, clear, goPage, changeClient, api, tambah, ubah, hapus } = usePenggunaController()

const columns = [
  { key: 'akun', label: 'Akun' },
  { key: 'peran', label: 'Peran' },
  { key: 'cabang', label: 'Cabang' },
  { key: 'client', label: 'Client' },
  { key: 'dibuat', label: 'Dibuat' },
  { key: 'aksi', label: '', align: 'num' as const }
]

const opsiCabang = computed(() => api.value.tenantOptions({ clientId: filters.value.client || null, includeAll: true, withClient: !filters.value.client }))
</script>

<template>
  <FilterBar clearable @submit="apply" @clear="clear">
    <FieldSelect id="fpClient" :model-value="draft.client" label="Client" :options="api.clientOptions({ includeAll: true })" @update:model-value="changeClient" />
    <FieldSelect id="fpCabang" v-model="draft.tenant" label="Cabang" :options="opsiCabang" />
    <FieldInput id="fpCari" v-model="draft.cari" label="Cari username / nama" grow placeholder="cth: c0001.budi" />
    <template #trailing><button type="button" class="btn btn-primary" @click="tambah">+ Buat akun</button></template>
  </FilterBar>

  <UiResource v-slot="{ data }" :state="state">
    <div class="filters">
      <span class="hint">Total <strong>{{ data.total }}</strong> akun. Login POS memakai username tanpa spasi, cth <span class="mono">@c0001.budi</span>.</span>
    </div>
    <UiCard title="Akun client" hint="Akun dibuat langsung di Supabase Auth, lalu dipasangkan ke cabang.">
      <UiDataTable :columns="columns" :rows="data.rows" :row-key="(r) => r.id" empty="Belum ada akun yang cocok. Buat akun untuk client terlebih dulu.">
        <template #cell-akun="{ row }"><UiCellStack strong :main="`@${row.username}`" :sub="row.name" /></template>
        <template #cell-peran="{ row }"><UiBadge :tone="row.role === 'admin' ? 'info' : ''">{{ row.role === 'admin' ? 'Admin' : 'Kasir' }}</UiBadge></template>
        <template #cell-cabang="{ row }"><UiCellStack :main="api.tenant(row.tenant_id)?.name ?? row.tenant_id" :sub="row.tenant_id" /></template>
        <template #cell-client="{ row }">{{ api.clientName(api.tenant(row.tenant_id)?.client_id) }}</template>
        <template #cell-dibuat="{ row }">{{ formatDate(row.created_at) }}</template>
        <template #cell-aksi="{ row }"><UiRowActions :buttons="[{ label: 'Ubah', onClick: () => ubah(row) }, { label: 'Hapus', onClick: () => hapus(row) }]" /></template>
      </UiDataTable>
      <UiPager :total="data.total" :limit="PENGGUNA_LIMIT" :offset="filters.offset" @go="goPage" />
    </UiCard>
  </UiResource>
</template>
