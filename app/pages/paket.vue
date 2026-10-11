<script setup lang="ts">
const { state, tambah, ubah, toggle, hapus } = usePaketController()

const columns = [
  { key: 'paket', label: 'Paket' },
  { key: 'harga', label: 'Harga / bulan', align: 'num' as const },
  { key: 'cabang', label: 'Maks cabang', align: 'num' as const },
  { key: 'pengguna', label: 'Maks pengguna', align: 'num' as const },
  { key: 'status', label: 'Status' },
  { key: 'dipakai', label: 'Dipakai', align: 'num' as const },
  { key: 'catatan', label: 'Catatan' },
  { key: 'aksi', label: '', align: 'num' as const }
]

const hargaPositif = (paket: { price_month: number | string | null }[]): number[] => paket.map((p) => toNumber(p.price_month)).filter((n) => n > 0)
</script>

<template>
  <UiResource v-slot="{ data }" :state="state">
    <UiStatGrid>
      <UiStat label="Jumlah paket" :value="formatNumber(data.paket.length)" :note="`${formatNumber(data.paket.filter((p) => p.is_active).length)} aktif`" />
      <UiStat label="Termurah" :value="hargaPositif(data.paket).length ? formatRupiah(Math.min(...hargaPositif(data.paket))) : '-'" />
      <UiStat label="Termahal" :value="hargaPositif(data.paket).length ? formatRupiah(Math.max(...hargaPositif(data.paket))) : '-'" />
    </UiStatGrid>
    <div class="filters">
      <span class="hint">Batas jumlah cabang dan pengguna ditegakkan oleh database saat client menambah cabang/pengguna.</span>
      <button type="button" class="btn btn-primary" style="margin-left: auto" @click="tambah">+ Tambah paket</button>
    </div>
    <UiCard title="Daftar paket">
      <UiDataTable :columns="columns" :rows="data.paket" :row-key="(r) => r.code" empty="Belum ada paket. Tambahkan paket pertama.">
        <template #cell-paket="{ row }"><UiCellStack strong :main="row.name" :sub="row.code" /></template>
        <template #cell-harga="{ row }">{{ toNumber(row.price_month) ? formatRupiah(row.price_month) : 'gratis' }}</template>
        <template #cell-cabang="{ row }">{{ row.max_branches }}</template>
        <template #cell-pengguna="{ row }">{{ row.max_users }}</template>
        <template #cell-status="{ row }"><UiBadge :tone="row.is_active ? 'ok' : ''">{{ row.is_active ? 'aktif' : 'nonaktif' }}</UiBadge></template>
        <template #cell-dipakai="{ row }">{{ formatNumber(data.dipakai[row.code] ?? 0) }}</template>
        <template #cell-catatan="{ row }">{{ row.note || '-' }}</template>
        <template #cell-aksi="{ row }">
          <UiRowActions
            :buttons="[
              { label: 'Ubah', onClick: () => ubah(row) },
              { label: row.is_active ? 'Nonaktifkan' : 'Aktifkan', onClick: () => toggle(row) },
              { label: 'Hapus', onClick: () => hapus(row) }
            ]"
          />
        </template>
      </UiDataTable>
    </UiCard>
  </UiResource>
</template>
