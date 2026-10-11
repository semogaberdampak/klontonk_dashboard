<script setup lang="ts">
const { filters, state, draft, apply, clear, goPage, go, tambah, ubah, ubahStatus } = useKlienController()

const columns = [
  { key: 'client', label: 'Client' },
  { key: 'kontak', label: 'Kontak' },
  { key: 'status', label: 'Status' },
  { key: 'paket', label: 'Paket' },
  { key: 'langganan', label: 'Langganan' },
  { key: 'cabang', label: 'Cabang', align: 'num' as const },
  { key: 'pengguna', label: 'Pengguna', align: 'num' as const },
  { key: 'omzet', label: 'Omzet 30 hari', align: 'num' as const },
  { key: 'aksi', label: '', align: 'num' as const }
]

const kontakOf = (c: { contact_name: string | null; contact_phone: string | null }): string => [c.contact_name, c.contact_phone].filter(Boolean).join(' / ')
</script>

<template>
  <FilterBar clearable @submit="apply" @clear="clear">
    <FieldInput id="fkCari" v-model="draft.cari" label="Cari nama client" grow placeholder="cth: warung" />
    <FieldSelect id="fkStatus" v-model="draft.status" label="Status" :options="STATUS_OPTIONS" />
    <template #trailing><button type="button" class="btn btn-primary" @click="tambah">+ Tambah client</button></template>
  </FilterBar>

  <UiResource v-slot="{ data }" :state="state">
    <UiCard :title="`Daftar client (${formatNumber(data.total)})`" hint="Angka cabang, pengguna, dan omzet dihitung oleh database.">
      <UiDataTable
        :columns="columns"
        :rows="data.rows"
        :row-key="(r) => r.id"
        :empty="filters.cari || filters.status ? 'Tidak ada client yang cocok dengan filter.' : 'Belum ada client. Tambahkan client pertama.'"
      >
        <template #cell-client="{ row }"><UiCellStack strong :main="row.name" :sub="row.id" /></template>
        <template #cell-kontak="{ row }">
          <template v-if="kontakOf(row)">{{ kontakOf(row) }}</template>
          <span v-else class="cell-sub">belum diisi</span>
        </template>
        <template #cell-status="{ row }"><UiBadge :tone="statusTone(row.status)">{{ row.status }}</UiBadge></template>
        <template #cell-paket="{ row }"><UiCellStack v-if="row.plan_name" :main="row.plan_name" :sub="row.plan_code" /><template v-else>-</template></template>
        <template #cell-langganan="{ row }"><UiBadge :tone="subTone(row.sub_status, row.days_left)">{{ daysLabel(row.days_left) }}</UiBadge></template>
        <template #cell-cabang="{ row }">{{ formatNumber(row.branch_count) }}</template>
        <template #cell-pengguna="{ row }">{{ formatNumber(row.user_count) }}</template>
        <template #cell-omzet="{ row }">{{ formatRupiah(row.omzet_30d) }}</template>
        <template #cell-aksi="{ row }">
          <UiRowActions
            :buttons="[
              { label: 'Ubah', onClick: () => ubah(row) },
              { label: 'Cabang', onClick: () => go('/cabang', { client: row.id }) },
              { label: 'Langganan', onClick: () => go('/langganan', { client: row.id }) },
              row.status === 'aktif'
                ? { label: 'Nonaktifkan', title: 'Tandai client tidak aktif', onClick: () => ubahStatus(row, 'suspend') }
                : { label: 'Aktifkan', title: 'Tandai client aktif kembali', onClick: () => ubahStatus(row, 'aktif') }
            ]"
          />
        </template>
      </UiDataTable>
      <UiPager :total="data.total" :limit="KLIEN_LIMIT" :offset="filters.offset" @go="goPage" />
    </UiCard>
  </UiResource>
</template>
