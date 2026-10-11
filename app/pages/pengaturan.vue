<script setup lang="ts">
import { APP_VERSION, EMAIL_DOMAIN, PAGE_SIZE } from '~/config'

const { admin, state, auditDays, eventDays, pangkas, bersihkanCache } = usePengaturanController()
const supabaseUrl = useRuntimeConfig().public.supabaseUrl

const adminColumns = [
  { key: 'admin', label: 'Admin platform' },
  { key: 'id', label: 'ID pengguna' },
  { key: 'peran', label: 'Peran' }
]
const systemColumns = [
  { key: 'aplikasi', label: 'Aplikasi' },
  { key: 'server', label: 'Server data' },
  { key: 'mode', label: 'Mode data' },
  { key: 'domain', label: 'Domain akun client' },
  { key: 'baris', label: 'Baris per halaman' }
]
const quotaColumns = [
  { key: 'label', label: 'Data' },
  { key: 'nilai', label: 'Jumlah', align: 'num' as const }
]
</script>

<template>
  <UiCard title="Akun Anda">
    <UiDataTable :columns="adminColumns" :rows="[admin ?? { id: '-', name: '-', email: null }]" :row-key="(r) => r.id">
      <template #cell-admin="{ row }"><UiCellStack strong :main="row.name || '-'" :sub="row.email || 'email tidak tercatat'" /></template>
      <template #cell-id="{ row }"><UiMono>{{ row.id }}</UiMono></template>
      <template #cell-peran><UiBadge tone="ok">superadmin</UiBadge></template>
    </UiDataTable>
  </UiCard>

  <div class="grid-2">
    <UiCard title="Sistem">
      <UiDataTable :columns="systemColumns" :rows="[0]" :row-key="() => 'sistem'">
        <template #cell-aplikasi>Klontonk Dashboard v{{ APP_VERSION }}</template>
        <template #cell-server><UiMono>{{ supabaseUrl }}</UiMono></template>
        <template #cell-mode><UiBadge tone="info">multi-tenant (1 database)</UiBadge></template>
        <template #cell-domain><UiMono>@{{ EMAIL_DOMAIN }}</UiMono></template>
        <template #cell-baris>{{ formatNumber(PAGE_SIZE) }}</template>
      </UiDataTable>
    </UiCard>
    <UiCard title="Kuota data terpakai">
      <UiResource v-slot="{ data: jumlah }" :state="state">
        <UiDataTable
          :columns="quotaColumns"
          :rows="[
            { label: 'Client', nilai: jumlah.klien },
            { label: 'Cabang', nilai: jumlah.cabang },
            { label: 'Pengguna', nilai: jumlah.pengguna },
            { label: 'Baris log audit', nilai: jumlah.logAudit },
            { label: 'Baris log teknis', nilai: jumlah.logTeknis }
          ]"
          :row-key="(r) => r.label"
        >
          <template #cell-nilai="{ row }">{{ row.nilai === null ? 'tidak terbaca' : formatNumber(row.nilai) }}</template>
        </UiDataTable>
      </UiResource>
    </UiCard>
  </div>

  <UiCard title="Retensi log">
    <div class="filters">
      <div class="field"><label for="rpAudit">Simpan log audit (hari)</label><input id="rpAudit" v-model="auditDays" type="number" min="30" max="3650" /></div>
      <div class="field"><label for="rpEvent">Simpan log teknis (hari)</label><input id="rpEvent" v-model="eventDays" type="number" min="7" max="3650" /></div>
      <button type="button" class="btn btn-primary" @click="pangkas">Pangkas log lama</button>
    </div>
    <p class="hint">
      Minimal 30 hari (log audit) dan 7 hari (log teknis). Pada Free plan (500 MB), pemangkasan berkala menjaga aplikasi tetap ringan. Log yang dipangkas tidak bisa dikembalikan -- unduh CSV dulu bila perlu arsip.
    </p>
  </UiCard>

  <UiCard title="Cache aplikasi">
    <p class="muted">Cache dipakai agar dashboard tetap bisa dibuka saat koneksi bermasalah. Bersihkan bila tampilan terasa "nyangkut" di versi lama.</p>
    <div class="filters"><button type="button" class="btn btn-secondary" @click="bersihkanCache">Bersihkan cache aplikasi</button></div>
    <p class="hint">
      Darurat (bila tampilan benar-benar tidak bisa dipakai): buka <span class="mono">/?reset-cache=1</span>. Setiap rilis, naikkan <span class="mono">CACHE_NAME</span> di public/sw.js agar semua perangkat mengambil versi baru.
    </p>
  </UiCard>

  <UiCard title="Batasan & catatan Free plan">
    <ul class="muted" style="margin: 0; padding-left: 18px; line-height: 1.7">
      <li><strong>Free plan:</strong> 500 MB database, 1 GB file, 5 GB transfer, retensi log platform 1 hari.</li>
      <li><strong>Proyek Free akan di-pause bila tidak ada aktivitas selama 1 minggu.</strong> Karena project ini dipakai POS setiap hari, risikonya kecil -- tetapi perhatikan saat semua client libur panjang.</li>
      <li>Retensi log platform 1 hari berarti log bawaan Supabase tidak bisa dijadikan arsip; itulah mengapa dashboard ini menyimpan log sendiri di tabel <span class="mono">audit_logs</span> dan <span class="mono">client_events</span>.</li>
      <li>Fitur membaca log platform Supabase (Auth/Postgres) menunggu naik ke Pro + Edge Function, karena butuh kunci rahasia di sisi server.</li>
    </ul>
  </UiCard>
</template>
