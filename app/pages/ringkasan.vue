<script setup lang="ts">
const { state, go } = useRingkasanController()

const attentionColumns = [
  { key: 'client', label: 'Client' },
  { key: 'alasan', label: 'Alasan' },
  { key: 'langganan', label: 'Langganan' },
  { key: 'aksi', label: 'Batch', align: 'num' as const }
]
const clientColumns = [
  { key: 'client', label: 'Client' },
  { key: 'paket', label: 'Paket' },
  { key: 'cabang', label: 'Cabang', align: 'num' as const },
  { key: 'pengguna', label: 'Pengguna', align: 'num' as const },
  { key: 'sisa', label: 'Sisa langganan' },
  { key: 'trx', label: 'Trx 30 hari', align: 'num' as const },
  { key: 'omzet', label: 'Omzet 30 hari', align: 'num' as const },
  { key: 'error', label: 'Error 7 hari', align: 'num' as const },
  { key: 'aksi', label: '', align: 'num' as const }
]
const activityColumns = [
  { key: 'waktu', label: 'Waktu' },
  { key: 'pelaku', label: 'Pelaku' },
  { key: 'aksi', label: 'Aksi' },
  { key: 'objek', label: 'Objek' },
  { key: 'rincian', label: 'Rincian' }
]
const errorColumns = [
  { key: 'waktu', label: 'Waktu' },
  { key: 'sumber', label: 'Sumber' },
  { key: 'pesan', label: 'Pesan' },
  { key: 'versi', label: 'Versi' }
]
</script>

<template>
  <UiResource v-slot="{ data }" :state="state">
    <UiCard v-if="!data.klien.length" title="Belum ada client" hint="Tambahkan client pertama untuk mulai memantau.">
      <p class="muted">Satu client mewakili satu pelanggan berlangganan, dan boleh memiliki beberapa cabang.</p>
      <button type="button" class="btn btn-primary" @click="go('/klien')">Tambah client</button>
    </UiCard>

    <template v-else>
      <UiStatGrid>
        <UiStat label="Client" :value="formatNumber(data.klien.length)" :note="`${formatNumber(data.klien.filter((c) => c.status === 'aktif').length)} aktif`" />
        <UiStat label="Cabang" :value="formatNumber(sumOf(data.klien, 'branch_count'))" />
        <UiStat label="Pengguna" :value="formatNumber(sumOf(data.klien, 'user_count'))" />
        <UiStat label="Transaksi 30 hari" :value="formatNumber(sumOf(data.klien, 'trx_30d'))" />
        <UiStat label="Omzet 30 hari" :value="formatRupiah(sumOf(data.klien, 'omzet_30d'))" />
        <UiStat label="Perlu perhatian" :value="formatNumber(data.klien.filter(needsAttention).length)" :tone="data.klien.some(needsAttention) ? 'warning' : 'success'" />
        <UiStat label="Error 7 hari" :value="formatNumber(sumOf(data.klien, 'errors_7d'))" :tone="sumOf(data.klien, 'errors_7d') ? 'danger' : 'success'" />
      </UiStatGrid>

      <UiCard title="Perlu perhatian" hint="Client yang bermasalah atau langganannya mendekati akhir.">
        <UiDataTable :columns="attentionColumns" :rows="data.klien.filter(needsAttention)" :row-key="(r) => r.id" empty="Semua client sehat -- tidak ada yang perlu perhatian.">
          <template #cell-client="{ row }"><UiCellStack strong :main="row.name" :sub="row.id" /></template>
          <template #cell-alasan="{ row }">{{ alasanPerhatian(row) }}</template>
          <template #cell-langganan="{ row }"><UiBadge :tone="subTone(row.sub_status, row.days_left)">{{ daysLabel(row.days_left) }}</UiBadge></template>
          <template #cell-aksi="{ row }">
            <UiRowActions :buttons="[{ label: 'Pemakaian', onClick: () => go('/pemakaian', { client: row.id }) }, { label: 'Langganan', onClick: () => go('/langganan', { client: row.id }) }]" />
          </template>
        </UiDataTable>
      </UiCard>

      <UiCard title="Semua client">
        <UiDataTable :columns="clientColumns" :rows="data.klien" :row-key="(r) => r.id">
          <template #cell-client="{ row }"><UiCellStack strong :main="row.name" :sub="row.id" /></template>
          <template #cell-paket="{ row }"><UiCellStack v-if="row.plan_name" :main="row.plan_name" :sub="row.plan_code" /><template v-else>-</template></template>
          <template #cell-cabang="{ row }">{{ formatNumber(row.branch_count) }}</template>
          <template #cell-pengguna="{ row }">{{ formatNumber(row.user_count) }}</template>
          <template #cell-sisa="{ row }"><UiBadge :tone="subTone(row.sub_status, row.days_left)">{{ daysLabel(row.days_left) }}</UiBadge></template>
          <template #cell-trx="{ row }">{{ formatNumber(row.trx_30d) }}</template>
          <template #cell-omzet="{ row }">{{ formatRupiah(row.omzet_30d) }}</template>
          <template #cell-error="{ row }"><UiBadge v-if="toNumber(row.errors_7d) > 0" tone="bad">{{ formatNumber(row.errors_7d) }}</UiBadge><template v-else>0</template></template>
          <template #cell-aksi="{ row }"><UiRowActions :buttons="[{ label: 'Log', onClick: () => go('/log-audit', { client: row.id }) }]" /></template>
        </UiDataTable>
      </UiCard>

      <div class="grid-2">
        <UiCard title="Aktivitas terbaru" hint="Dicatat otomatis oleh database.">
          <UiDataTable
            :columns="activityColumns"
            :rows="data.aktivitas ?? []"
            :row-key="(_, i) => i"
            :empty="data.aktivitas ? 'Belum ada aktivitas tercatat.' : 'Log audit belum bisa dibaca.'"
          >
            <template #cell-waktu="{ row }"><UiCellStack :main="relTime(row.at)" :sub="formatDateTime(row.at)" /></template>
            <template #cell-pelaku="{ row }"><UiCellStack :main="row.actor_name || '-'" :sub="row.actor_role" /></template>
            <template #cell-aksi="{ row }"><UiBadge tone="info">{{ row.action }}</UiBadge></template>
            <template #cell-objek="{ row }"><UiCellStack :main="row.entity" :sub="row.entity_id" /></template>
            <template #cell-rincian="{ row }"><span class="detail-cell">{{ prettyDetail(row.detail) }}</span></template>
          </UiDataTable>
        </UiCard>
        <UiCard title="Error terbaru dari client">
          <UiDataTable
            :columns="errorColumns"
            :rows="data.errors ?? []"
            :row-key="(_, i) => i"
            :empty="data.errors ? 'Tidak ada error dari client. Bagus.' : 'Log teknis belum bisa dibaca.'"
          >
            <template #cell-waktu="{ row }">{{ relTime(row.at) }}</template>
            <template #cell-sumber="{ row }"><UiBadge tone="warn">{{ row.source }}</UiBadge></template>
            <template #cell-pesan="{ row }"><span class="detail-cell">{{ row.message }}</span></template>
            <template #cell-versi="{ row }">{{ row.app_version || '-' }}</template>
          </UiDataTable>
        </UiCard>
      </div>
    </template>
  </UiResource>
</template>
