import { page } from '../supabase.js';
import { UI, q } from '../ui.js';
import { Auth } from '../auth.js';
import { Lookups } from '../lookups.js';
import { Router } from '../router.js';
import { formatNumber, formatDateTime, relTime, prettyDetail, toCsv, downloadCsv } from '../format.js';

// ============ LOG AUDIT ============
// Dicatat OTOMATIS oleh trigger di database (db/dashboard-schema.sql), bukan oleh aplikasi:
// perubahan stok & harga, penjualan, retur, akun dibuat/dihapus, serta perubahan data
// client/cabang/paket/langganan. Sifatnya append-only -- client tidak bisa menyunting atau
// menghapus baris log, dan dashboard hanya diberi hak baca.

const LIMIT = 50;
const HALAMAN = '/log-audit';

const AKSI = [
  { value: '', label: 'Semua aksi' },
  { value: 'sale.checkout', label: 'Penjualan dicatat' },
  { value: 'return.process', label: 'Retur diproses' },
  { value: 'stock.create', label: 'Barang ditambahkan' },
  { value: 'stock.update', label: 'Stok diubah' },
  { value: 'stock.delete', label: 'Barang dihapus' },
  { value: 'price.update', label: 'Harga diubah' },
  { value: 'user.create', label: 'Akun dibuat' },
  { value: 'user.update', label: 'Akun diubah' },
  { value: 'user.delete', label: 'Akun dihapus' },
  { value: 'auth.login', label: 'Login aplikasi POS' },
  { value: 'client.create', label: 'Client dibuat' },
  { value: 'client.update', label: 'Client diubah' },
  { value: 'branch.create', label: 'Cabang dibuat' },
  { value: 'branch.update', label: 'Cabang diubah' },
  { value: 'branch.delete', label: 'Cabang dihapus' },
  { value: 'plan.create', label: 'Paket dibuat' },
  { value: 'plan.update', label: 'Paket diubah' },
  { value: 'plan.delete', label: 'Paket dihapus' },
  { value: 'subscription.create', label: 'Langganan dicatat' },
  { value: 'subscription.update', label: 'Langganan diubah' },
  { value: 'subscription.delete', label: 'Langganan dihapus' }
];

const TONE_AKSI = (aksi) => {
  if (aksi.endsWith('.delete')) return 'bad';
  if (aksi === 'sale.checkout') return 'ok';
  if (aksi === 'return.process') return 'warn';
  if (aksi.startsWith('auth.')) return 'info';
  return '';
};

let state = { filters: {}, total: 0, rows: [] };

function tanggalJakarta(offsetHari = 0) {
  const d = new Date(Date.now() + offsetHari * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function batasWaktu(tanggal, akhir = false) {
  if (!tanggal) return '';
  const jam = akhir ? '23:59:59.999' : '00:00:00.000';
  return new Date(`${tanggal}T${jam}+07:00`).toISOString();
}

function barFilter(f) {
  const opsiCabang = Lookups.tenantOptions({ clientId: f.client || null, includeAll: true, withClient: !f.client });
  return `<form class="filters" id="filterLog">
    <div class="field">
      <label for="faClient">Client</label>
      <select id="faClient" name="client">${Lookups.clientOptions({ includeAll: true })
        .map((o) => `<option value="${UI.escape(o.value)}"${o.value === f.client ? ' selected' : ''}>${UI.escape(o.label)}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label for="faCabang">Cabang</label>
      <select id="faCabang" name="tenant">${opsiCabang
        .map((o) => `<option value="${UI.escape(o.value)}"${o.value === f.tenant ? ' selected' : ''}>${UI.escape(o.label)}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label for="faAksi">Aksi</label>
      <select id="faAksi" name="aksi">${AKSI
        .map((a) => `<option value="${UI.escape(a.value)}"${a.value === f.aksi ? ' selected' : ''}>${UI.escape(a.label)}</option>`).join('')}</select>
    </div>
    <div class="field"><label for="faPelaku">Pelaku</label><input type="search" id="faPelaku" name="pelaku" value="${UI.escape(f.pelaku)}" placeholder="cth: Budi" /></div>
    <div class="field"><label for="faDari">Dari</label><input type="date" id="faDari" name="dari" value="${UI.escape(f.dari)}" /></div>
    <div class="field"><label for="faSampai">Sampai</label><input type="date" id="faSampai" name="sampai" value="${UI.escape(f.sampai)}" /></div>
    <button type="submit" class="btn btn-primary">Terapkan</button>
    <button type="button" class="btn btn-secondary" data-act="bersihkan">Bersihkan</button>
    <button type="button" class="btn btn-secondary" data-act="csv" style="margin-left:auto">Unduh CSV</button>
  </form>`;
}

export default {
  async render(params) {
    const adaTanggal = params.has('dari') || params.has('sampai');
    const filters = {
      client: params.get('client') || '',
      tenant: params.get('tenant') || '',
      aksi: params.get('aksi') || '',
      pelaku: (params.get('pelaku') || '').trim(),
      dari: params.get('dari') || (adaTanggal ? '' : tanggalJakarta(-7)),
      sampai: params.get('sampai') || (adaTanggal ? '' : tanggalJakarta(0)),
      offset: Math.max(0, Number(params.get('offset') || 0) || 0)
    };
    state.filters = filters;

    let tenantFilter = filters.tenant;
    if (!tenantFilter && filters.client) {
      const ids = Lookups.tenantsOf(filters.client).map((t) => t.id);
      if (ids.length) tenantFilter = `in.(${ids.join(',')})`;
    }

    const jalur = 'audit_logs?select=at,actor_name,actor_role,action,entity,entity_id,client_id,tenant_id,detail&order=at.desc'
      + q({
        'tenant_id!': tenantFilter,
        action: filters.aksi,
        actor_name: filters.pelaku ? `ilike.*${filters.pelaku.replace(/[(),*%\\]/g, ' ')}*` : '',
        at: filters.dari ? `gte.${batasWaktu(filters.dari)}` : ''
      })
      + (filters.sampai ? '&at=' + encodeURIComponent(`lte.${batasWaktu(filters.sampai, true)}`) : '');

    const hasil = await page(jalur, { from: filters.offset, to: filters.offset + LIMIT - 1 });

    if (!hasil.ok) {
      if (hasil.expired) { Auth.expired(); return UI.loading('Sesi berakhir. Mengarahkan ke login...'); }
      return barFilter(filters) + UI.errorBox(hasil.message);
    }

    state.total = hasil.total;
    state.rows = hasil.data;

    const tabel = UI.table({
      columns: [
        { label: 'Waktu', render: (r) => `${UI.escape(relTime(r.at))}<span class="cell-sub">${UI.escape(formatDateTime(r.at))}</span>` },
        { label: 'Pelaku', render: (r) => `${UI.escape(r.actor_name || '-')}<span class="cell-sub">${UI.escape(r.actor_role || '')}</span>` },
        { label: 'Aksi', render: (r) => UI.badge(r.action, TONE_AKSI(r.action)) },
        { label: 'Objek', render: (r) => `${UI.escape(r.entity)}${r.entity_id ? `<span class="cell-sub">${UI.escape(r.entity_id)}</span>` : ''}` },
        { label: 'Cabang / client', render: (r) => {
            const bagian = [];
            if (r.tenant_id) bagian.push(Lookups.tenant(r.tenant_id) ? Lookups.tenant(r.tenant_id).name + ` (${r.tenant_id})` : r.tenant_id);
            if (r.client_id) bagian.push(Lookups.clientName(r.client_id));
            return UI.escape(bagian.join(' - ') || '-');
          } },
        { label: 'Rincian', render: (r) => `<span class="detail-cell">${UI.escape(prettyDetail(r.detail))}</span>` },
        { label: '', align: 'num', render: (r) => UI.actions([UI.btnAksi('Detail', { act: 'detail', id: String(r.at) })]) }
      ],
      rows: hasil.data,
      empty: 'Tidak ada aktivitas pada periode/filter ini.'
    });

    return `${barFilter(filters)}
      <div class="stat-grid">
        ${UI.stat({ label: 'Baris log (filter)', value: formatNumber(hasil.total) })}
        ${UI.stat({ label: 'Periode', value: `${filters.dari || 'awal'} sd ${filters.sampai || 'sekarang'}`, note: 'default 7 hari terakhir' })}
        ${UI.stat({ label: 'Halaman', value: `${formatNumber(hasil.data.length)} baris` })}
      </div>
      ${UI.card({
        title: 'Log audit',
        hint: 'Termasuk perubahan stok/harga oleh kasir, penjualan, retur, dan akun. Tidak bisa disunting atau dihapus.',
        body: tabel + UI.pager({ total: hasil.total, limit: LIMIT, offset: filters.offset })
      })}`;
  },

  init() {
    const form = document.getElementById('filterLog');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        Router.go(HALAMAN, {
          client: form.querySelector('#faClient').value,
          tenant: form.querySelector('#faCabang').value,
          aksi: form.querySelector('#faAksi').value,
          pelaku: form.querySelector('#faPelaku').value.trim(),
          dari: form.querySelector('#faDari').value,
          sampai: form.querySelector('#faSampai').value
        });
      });
      const pilihClient = form.querySelector('#faClient');
      if (pilihClient) {
        pilihClient.addEventListener('change', () => {
          Router.go(HALAMAN, {
            client: pilihClient.value,
            aksi: form.querySelector('#faAksi').value,
            pelaku: form.querySelector('#faPelaku').value.trim(),
            dari: form.querySelector('#faDari').value,
            sampai: form.querySelector('#faSampai').value
          });
        });
      }
    }
    UI.bindPager(document.getElementById('pager'), { total: state.total, limit: LIMIT, offset: state.filters.offset }, (offset) => {
      Router.go(HALAMAN, {
        client: state.filters.client, tenant: state.filters.tenant, aksi: state.filters.aksi,
        pelaku: state.filters.pelaku, dari: state.filters.dari, sampai: state.filters.sampai, offset
      });
    });
  },

  async act(aksi, id) {
    if (aksi === 'bersihkan') { Router.go(HALAMAN, { dari: '', sampai: '' }); return; }

    if (aksi === 'csv') {
      if (!state.rows.length) { UI.toast('Tidak ada data untuk diunduh.', { type: 'warning' }); return; }
      const csv = toCsv(state.rows, [
        { label: 'waktu', key: 'at' },
        { label: 'pelaku', key: 'actor_name' },
        { label: 'peran', key: 'actor_role' },
        { label: 'aksi', key: 'action' },
        { label: 'objek', key: 'entity' },
        { label: 'objek_id', key: 'entity_id' },
        { label: 'client', key: 'client_id' },
        { label: 'cabang', key: 'tenant_id' },
        { label: 'rincian', value: (r) => prettyDetail(r.detail) }
      ]);
      downloadCsv(`log-audit-${tanggalJakarta(0)}.csv`, csv);
      UI.toast('CSV diunduh (hanya baris yang tampil).', { type: 'success' });
      return;
    }

    if (aksi === 'detail') {
      const baris = state.rows.find((r) => String(r.at) === String(id));
      if (!baris) return;
      await UI.modal({
        title: `${baris.action} - ${baris.entity}`,
        message: `Waktu: ${formatDateTime(baris.at)}\nPelaku: ${baris.actor_name || '-'} (${baris.actor_role || '-'})\nObjek: ${baris.entity} ${baris.entity_id || ''}\nCabang: ${baris.tenant_id || '-'}\nClient: ${baris.client_id || '-'}\n\nRincian:\n${prettyDetail(baris.detail)}\n\nData mentah:\n${JSON.stringify(baris.detail, null, 2)}`,
        icon: 'info',
        confirmText: 'Tutup'
      });
    }
  }
};