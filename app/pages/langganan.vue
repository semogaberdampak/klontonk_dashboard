<script setup lang="ts">
const { filters, state, draft, apply, clear, goPage, go, api, tambah, ubah, sinkron, perpanjang, hapus } = useLanggananController()

const attentionColumns = [
  { key: 'client', label: 'Client' },
  { key: 'paket', label: 'Paket' },
  { key: 'harga', label: 'Harga / bulan', align: 'num' as const },
  { key: 'berakhir', label: 'Berakhir' },
  { key: 'sisa', label: 'Sisa' },
  { key: 'aksi', label: '', align: 'num' as const }
]
const historyColumns = [
  { key: 'client', label: 'Client' },
  { key: 'paket', label: 'Paket' },
  { key: 'mulai', label: 'Mulai' },
  { key: 'berakhir', label: 'Berakhir' },
  { key: 'status', label: 'Status' },
  { key: 'catatan', label: 'Catatan' },
  { key: 'aksi', label: '', align: 'num' as const }
]
</script>

<template>
  <FilterBar clearable @submit="apply" @clear="clear">
    <FieldSelect id="flClient" v-model="draft.client" label="Client" :options="api.clientOptions({ includeAll: true })" />
    <FieldSelect id="flStatus" v-model="draft.status" label="Status" :options="STATUS_FILTER_OPTIONS" />
    <template #trailing>
      <button type="button" class="btn btn-secondary" @click="sinkron">Sinkronkan status</button>
      <button type="button" class="btn btn-primary" @click="tambah">+ Langganan baru</button>
    </template>
  </FilterBar>

  <UiResource v-slot="{ data }" :state="state">
    <template v-for="ringkasan in [summarize(data.ringkas)]" :key="'ringkasan'">
      <UiStatGrid>
        <UiStat label="Klien berlangganan" :value="formatNumber(ringkasan.berlaku.length)" :note="`${formatNumber(ringkasan.trial.length)} masih trial`" />
        <UiStat label="Potensi / bulan" :value="formatRupiah(ringkasan.potensi)" note="dari paket yang berlaku" />
        <UiStat label="Perlu perhatian" :value="formatNumber(ringkasan.perhatian.length)" :tone="ringkasan.perhatian.length ? 'warning' : 'success'" />
      </UiStatGrid>

      <UiCard title="Langganan perlu perhatian" hint="Termasuk yang belum punya langganan sama sekali.">
        <UiDataTable :columns="attentionColumns" :rows="ringkasan.perhatian" :row-key="(r) => r.id" empty="Semua langganan client masih jauh dari jatuh tempo.">
          <template #cell-client="{ row }"><UiCellStack strong :main="row.name" :sub="row.id" /></template>
          <template #cell-paket="{ row }">{{ row.plan_name || '-' }}</template>
          <template #cell-harga="{ row }">{{ row.price_month ? formatRupiah(row.price_month) : '-' }}</template>
          <template #cell-berakhir="{ row }">{{ formatDate(row.expires_at) }}</template>
          <template #cell-sisa="{ row }"><UiBadge :tone="subTone(row.sub_status, row.days_left)">{{ daysLabel(row.days_left) }}</UiBadge></template>
          <template #cell-aksi="{ row }"><UiRowActions :buttons="[{ label: 'Riwayat', onClick: () => go('/langganan', { client: row.id }) }]" /></template>
        </UiDataTable>
      </UiCard>
    </template>

    <UiCard :title="`Riwayat langganan (${formatNumber(data.riwayat.total)})`" hint="Yang berlaku adalah baris dengan masa berakhir paling akhir.">
      <UiDataTable :columns="historyColumns" :rows="data.riwayat.rows" :row-key="(r) => r.id" empty="Belum ada catatan langganan.">
        <template #cell-client="{ row }"><UiCellStack :main="row.client ? row.client.name : row.client_id" :sub="row.client_id" /></template>
        <template #cell-paket="{ row }"><UiCellStack :main="row.plan ? row.plan.name : row.plan_code" :sub="row.plan_code" /></template>
        <template #cell-mulai="{ row }">{{ formatDate(row.started_at) }}</template>
        <template #cell-berakhir="{ row }">{{ formatDate(row.expires_at) }}</template>
        <template #cell-status="{ row }"><UiBadge :tone="subTone(row.status, 1)">{{ row.status }}</UiBadge></template>
        <template #cell-catatan="{ row }">{{ row.note || '-' }}</template>
        <template #cell-aksi="{ row }">
          <UiRowActions
            :buttons="[
              { label: 'Ubah', onClick: () => ubah(row) },
              { label: '+30 hari', title: 'Perpanjang 30 hari dari tanggal berakhir / hari ini', onClick: () => perpanjang(row) },
              { label: 'Hapus', onClick: () => hapus(row) }
            ]"
          />
        </template>
      </UiDataTable>
      <UiPager :total="data.riwayat.total" :limit="LANGGANAN_LIMIT" :offset="filters.offset" @go="goPage" />
    </UiCard>
  </UiResource>
</template>
