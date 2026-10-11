<script setup lang="ts">
const { filters, state, draft, apply, changeClient, pilih, lastDays, exportCsv } = usePemakaianController()
const { api } = useLookups()

const overviewColumns = [
  { key: 'client', label: 'Client' },
  { key: 'cabang', label: 'Cabang', align: 'num' as const },
  { key: 'pengguna', label: 'Pengguna', align: 'num' as const },
  { key: 'trx', label: 'Trx 30 hari', align: 'num' as const },
  { key: 'omzet', label: 'Omzet 30 hari', align: 'num' as const },
  { key: 'log', label: 'Log 7 hari', align: 'num' as const },
  { key: 'error', label: 'Error 7 hari', align: 'num' as const },
  { key: 'langganan', label: 'Langganan' },
  { key: 'aksi', label: '', align: 'num' as const }
]
const infoColumns = [
  { key: 'paket', label: 'Paket' },
  { key: 'status', label: 'Status client' },
  { key: 'langganan', label: 'Langganan' },
  { key: 'cabang', label: 'Cabang', align: 'num' as const },
  { key: 'pengguna', label: 'Pengguna', align: 'num' as const }
]
const dailyColumns = [
  { key: 'tanggal', label: 'Tanggal' },
  { key: 'trx', label: 'Transaksi', align: 'num' as const },
  { key: 'omzet', label: 'Omzet', align: 'num' as const },
  { key: 'retur', label: 'Retur', align: 'num' as const },
  { key: 'nilaiRetur', label: 'Nilai retur', align: 'num' as const },
  { key: 'log', label: 'Log audit', align: 'num' as const },
  { key: 'error', label: 'Error', align: 'num' as const }
]
</script>

<template>
  <form class="filters" @submit.prevent="apply">
    <div class="field grow">
      <label for="fpmClient">Client</label>
      <select id="fpmClient" :value="draft.client" @change="changeClient(($event.target as HTMLSelectElement).value)">
        <option value="">Pilih client...</option>
        <option v-for="option in api.clientOptions()" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    </div>
    <FieldInput id="fpmDari" v-model="draft.dari" label="Dari" type="date" />
    <FieldInput id="fpmSampai" v-model="draft.sampai" label="Sampai" type="date" />
    <button type="submit" class="btn btn-primary">Terapkan</button>
    <button type="button" class="btn btn-secondary" @click="lastDays(30)">30 hari</button>
    <button type="button" class="btn btn-secondary" @click="lastDays(90)">90 hari</button>
    <button type="button" class="btn btn-secondary" style="margin-left: auto" @click="exportCsv">Unduh CSV</button>
  </form>

  <UiResource v-slot="{ data }" :state="state">
    <UiCard v-if="!filters.client" title="Pemakaian semua client (30 hari terakhir)" hint="Pilih client untuk melihat rincian harian.">
      <UiDataTable :columns="overviewColumns" :rows="data.daftar" :row-key="(r) => r.id" empty="Belum ada client.">
        <template #cell-client="{ row }"><UiCellStack strong :main="row.name" :sub="row.id" /></template>
        <template #cell-cabang="{ row }">{{ formatNumber(row.branch_count) }}</template>
        <template #cell-pengguna="{ row }">{{ formatNumber(row.user_count) }}</template>
        <template #cell-trx="{ row }">{{ formatNumber(row.trx_30d) }}</template>
        <template #cell-omzet="{ row }">{{ formatRupiah(row.omzet_30d) }}</template>
        <template #cell-log="{ row }">{{ formatNumber(row.logs_7d) }}</template>
        <template #cell-error="{ row }"><UiBadge v-if="toNumber(row.errors_7d)" tone="bad">{{ formatNumber(row.errors_7d) }}</UiBadge><template v-else>0</template></template>
        <template #cell-langganan="{ row }"><UiBadge :tone="subTone(row.sub_status, row.days_left)">{{ daysLabel(row.days_left) }}</UiBadge></template>
        <template #cell-aksi="{ row }"><UiRowActions :buttons="[{ label: 'Lihat pemakaian', onClick: () => pilih(row.id) }]" /></template>
      </UiDataTable>
    </UiCard>

    <template v-else>
      <template v-for="total in [totalUsage(data.harian)]" :key="'total'">
        <UiStatGrid>
          <UiStat label="Transaksi" :value="formatNumber(total.trx)" :note="`${filters.dari} sd ${filters.sampai}`" />
          <UiStat label="Omzet" :value="formatRupiah(total.omzet)" />
          <UiStat label="Retur" :value="formatNumber(total.retur)" :note="formatRupiah(total.nilaiRetur)" />
          <UiStat label="Log audit" :value="formatNumber(total.log)" />
          <UiStat label="Error teknis" :value="formatNumber(total.error)" :tone="total.error ? 'danger' : 'success'" />
        </UiStatGrid>
      </template>
      <UiCard :title="`Client: ${data.klien?.name ?? filters.client}`">
        <UiDataTable :columns="infoColumns" :rows="data.klien ? [data.klien] : []" :row-key="(r) => r.id">
          <template #cell-paket="{ row }"><UiCellStack :main="row.plan_name || '-'" :sub="row.plan_code" /></template>
          <template #cell-status="{ row }"><UiBadge :tone="row.status === 'aktif' ? 'ok' : 'warn'">{{ row.status }}</UiBadge></template>
          <template #cell-langganan="{ row }"><UiBadge :tone="subTone(row.sub_status, row.days_left)">{{ daysLabel(row.days_left) }}</UiBadge></template>
          <template #cell-cabang="{ row }">{{ formatNumber(row.branch_count) }}</template>
          <template #cell-pengguna="{ row }">{{ formatNumber(row.user_count) }}</template>
        </UiDataTable>
      </UiCard>
      <UiCard title="Aktivitas harian" hint="Dihitung database (RPC usage_daily).">
        <UiDataTable :columns="dailyColumns" :rows="data.harian" :row-key="(r) => r.day" empty="Tidak ada aktivitas pada periode ini.">
          <template #cell-tanggal="{ row }">{{ formatDate(row.day) }}</template>
          <template #cell-trx="{ row }">{{ formatNumber(row.trx_count) }}</template>
          <template #cell-omzet="{ row }">{{ formatRupiah(row.trx_total) }}</template>
          <template #cell-retur="{ row }">{{ formatNumber(row.return_count) }}</template>
          <template #cell-nilaiRetur="{ row }">{{ formatRupiah(row.return_amount) }}</template>
          <template #cell-log="{ row }">{{ formatNumber(row.log_count) }}</template>
          <template #cell-error="{ row }"><UiBadge v-if="toNumber(row.event_count)" tone="bad">{{ formatNumber(row.event_count) }}</UiBadge><template v-else>0</template></template>
        </UiDataTable>
      </UiCard>
    </template>
  </UiResource>
</template>
