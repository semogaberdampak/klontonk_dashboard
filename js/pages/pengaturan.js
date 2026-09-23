import { rpc, page, pesanError } from '../supabase.js';
import { UI } from '../ui.js';
import { Auth } from '../auth.js';
import { reloadPage } from '../router.js';
import { formatNumber } from '../format.js';
import { APP_VERSION, SUPABASE_URL, PAGE_SIZE, EMAIL_DOMAIN } from '../config.js';

// ============ PENGATURAN ============
// Informasi sistem, kuota data, pemangkas log (Free plan hanya 500 MB), dan cache aplikasi.

const RETENSI_AUDIT_DEFAULT = 180;   // 6 bulan
const RETENSI_EVENT_DEFAULT = 60;    // 2 bulan
const CACHE_TIMEOUT_MS = 8000;

async function hitung(jalur) {
  const hasil = await page(jalur, { from: 0, to: 0 });
  return hasil.ok ? hasil.total : null;
}

async function bersihkanCache() {
  const registrasi = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
  const worker = registrasi && registrasi.active;

  if (worker) {
    return new Promise((resolve) => {
      const kanal = new MessageChannel();
      const timer = setTimeout(() => resolve({ ok: false, precached: 0 }), CACHE_TIMEOUT_MS);
      kanal.port1.onmessage = (event) => { clearTimeout(timer); resolve(event.data); };
      worker.postMessage({ type: 'CLEAR_CACHE' }, [kanal.port2]);
    });
  }

  if (typeof caches === 'undefined') return { ok: false, precached: 0 };
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
  return { ok: true, precached: 0 };
}

export default {
  async render() {
    const [klien, cabang, pengguna, logAudit, logTeknis] = await Promise.all([
      hitung('clients?select=id'),
      hitung('tenants?select=id'),
      hitung('profiles?select=id'),
      hitung('audit_logs?select=id'),
      hitung('client_events?select=id')
    ]);

    const admin = Auth.admin || {};

    const infoAdmin = UI.table({
      columns: [
        { label: 'Admin platform', render: () => `<span class="cell-strong">${UI.escape(admin.name || '-')}</span><span class="cell-sub">${UI.escape(admin.email || 'email tidak tercatat')}</span>` },
        { label: 'ID pengguna', render: () => `<span class="mono">${UI.escape(admin.id || '-')}</span>` },
        { label: 'Peran', render: () => UI.badge('superadmin', 'ok') }
      ],
      rows: [admin]
    });

    const infoSistem = UI.table({
      columns: [
        { label: 'Aplikasi', render: () => `Klontonk Dashboard v${UI.escape(APP_VERSION)}` },
        { label: 'Server data', render: () => `<span class="mono">${UI.escape(SUPABASE_URL)}</span>` },
        { label: 'Mode data', render: () => UI.badge('multi-tenant (1 database)', 'info') },
        { label: 'Domain akun client', render: () => `<span class="mono">@${UI.escape(EMAIL_DOMAIN)}</span>` },
        { label: 'Baris per halaman', render: () => formatNumber(PAGE_SIZE) }
      ],
      rows: [{}]
    });

    const kuota = UI.table({
      columns: [
        { label: 'Data', key: 'label' },
        { label: 'Jumlah', align: 'num', render: (r) => (r.nilai === null ? 'tidak terbaca' : formatNumber(r.nilai)) }
      ],
      rows: [
        { label: 'Client', nilai: klien },
        { label: 'Cabang', nilai: cabang },
        { label: 'Pengguna', nilai: pengguna },
        { label: 'Baris log audit', nilai: logAudit },
        { label: 'Baris log teknis', nilai: logTeknis }
      ]
    });

    const formRetensi = `<div class="filters">
        <div class="field"><label for="rpAudit">Simpan log audit (hari)</label><input type="number" id="rpAudit" min="30" max="3650" value="${RETENSI_AUDIT_DEFAULT}" /></div>
        <div class="field"><label for="rpEvent">Simpan log teknis (hari)</label><input type="number" id="rpEvent" min="7" max="3650" value="${RETENSI_EVENT_DEFAULT}" /></div>
        <button type="button" class="btn btn-primary" data-act="pangkas">Pangkas log lama</button>
      </div>
      <p class="hint">Minimal 30 hari (log audit) dan 7 hari (log teknis). Pada Free plan (500 MB), pemangkasan berkala menjaga aplikasi tetap ringan. Log yang dipangkas tidak bisa dikembalikan -- unduh CSV dulu bila perlu arsip.</p>`;

    const cache = `<p class="muted">Cache dipakai agar dashboard tetap bisa dibuka saat koneksi bermasalah. Bersihkan bila tampilan terasa "nyangkut" di versi lama.</p>
      <div class="filters">
        <button type="button" class="btn btn-secondary" data-act="bersihkan-cache">Bersihkan cache aplikasi</button>
      </div>
      <p class="hint">Darurat (bila tampilan benar-benar tidak bisa dipakai): buka <span class="mono">index.html?reset-cache=1</span>. Setiap rilis, naikkan <span class="mono">CACHE_NAME</span> di sw.js dan <span class="mono">?v=</span> di index.html agar semua perangkat mengambil versi baru.</p>`;

    const batasan = `<ul class="muted" style="margin:0;padding-left:18px;line-height:1.7">
      <li><strong>Free plan:</strong> 500 MB database, 1 GB file, 5 GB transfer, retensi log platform 1 hari.</li>
      <li><strong>Proyek Free akan di-pause bila tidak ada aktivitas selama 1 minggu.</strong> Karena project ini dipakai POS setiap hari, risikonya kecil -- tetapi perhatikan saat semua client libur panjang.</li>
      <li>Retensi log platform 1 hari berarti log bawaan Supabase tidak bisa dijadikan arsip; itulah mengapa dashboard ini menyimpan log sendiri di tabel <span class="mono">audit_logs</span> dan <span class="mono">client_events</span>.</li>
      <li>Fitur membaca log platform Supabase (Auth/Postgres) menunggu naik ke Pro + Edge Function, karena butuh kunci rahasia di sisi server.</li>
    </ul>`;

    return `${UI.card({ title: 'Akun Anda', body: infoAdmin })}
      <div class="grid-2">
        ${UI.card({ title: 'Sistem', body: infoSistem })}
        ${UI.card({ title: 'Kuota data terpakai', body: kuota })}
      </div>
      ${UI.card({ title: 'Retensi log', body: formRetensi })}
      ${UI.card({ title: 'Cache aplikasi', body: cache })}
      ${UI.card({ title: 'Batasan & catatan Free plan', body: batasan })}`;
  },

  async act(aksi) {
    if (aksi === 'pangkas') {
      const audit = Number(document.getElementById('rpAudit').value) || RETENSI_AUDIT_DEFAULT;
      const event = Number(document.getElementById('rpEvent').value) || RETENSI_EVENT_DEFAULT;

      const yakin = await UI.modal({
        title: 'Pangkas log lama',
        message: `Hapus log audit lebih tua dari ${audit} hari dan log teknis lebih tua dari ${event} hari? Tindakan ini tidak bisa dibatalkan.`,
        icon: 'warning', confirmText: 'Ya, Pangkas', cancelText: 'Batal', variant: 'danger'
      });
      if (!yakin) return;

      const hasil = await rpc('purge_old_logs', { p_audit_days: audit, p_event_days: event });
      if (!hasil.ok) { UI.toast(pesanError(hasil), { type: 'danger', duration: 8000 }); return; }
      const data = hasil.data || {};
      UI.toast(`Selesai: ${formatNumber(data.audit_deleted)} baris log audit dan ${formatNumber(data.events_deleted)} baris log teknis dihapus.`, { type: 'success', duration: 8000 });
      reloadPage();
      return;
    }

    if (aksi === 'bersihkan-cache') {
      const hasil = await bersihkanCache();
      if (hasil && hasil.ok) {
        UI.toast('Cache dibersihkan. Memuat ulang...', { type: 'success' });
        setTimeout(() => window.location.reload(), 800);
      } else {
        UI.toast('Gagal membersihkan cache. Coba muat ulang halaman.', { type: 'warning' });
      }
    }
  }
};