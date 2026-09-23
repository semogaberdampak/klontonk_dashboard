import { page } from '../supabase.js';
import { UI, q } from '../ui.js';
import { Auth } from '../auth.js';
import { Lookups } from '../lookups.js';
import { Router } from '../router.js';
import { formatNumber, formatRupiah, formatDateTime, toCsv, downloadCsv } from '../format.js';

// ============ RETUR (baca saja) ============
// Riwayat retur barang. kind = 'pelanggan' (barang kembali ke stok, ada uang kembali) atau
// 'supplier' (barang rusak/kedaluwarsa keluar dari stok, tanpa uang). Sama seperti transaksi,
// data hanya bisa dibaca -- pencatatan resmi ada di aplikasi POS (process_return()).

const LIMIT = 50;
const HALAMAN = '/retur';

const JENIS = [
  { value: '', label: 'Semua jenis' },
  { value: 'pelanggan', label: 'Dari pelanggan (stok masuk)' },
  { value: 'supplier', label: 'Ke supplier (stok keluar)' }
];

const ALASAN = [
  { value: '', label: 'Semua alasan' },
  { value: 'rusak', label: 'Rusak' },
  { value: 'kedaluwarsa', label: 'Kedaluwarsa' },
  { value: 'salah_barang', label: 'Salah barang' },
  { value: 'tidak_sesuai', label: 'Tidak sesuai' },
  { value: 'lainnya', label: 'Lainnya' }
];

const LABEL_ALASAN = { rusak: 'Rusak', kedaluwarsa: 'Kedaluwarsa', salah_barang: 'Salah barang', tidak_sesuai: 'Tidak sesuai', lainnya: 'Lainnya' };

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
  return `<form class="filters" id="filterRetur">
    <div class="field">
      <label for="frClient">Client</label>
      <select id="frClient" name="client">${Lookups.clientOptions({ includeAll: true })
        .map((o) => `<option value="${UI.escape(o.value)}"${o.value === f.client ? ' selected' : ''}>${UI.escape(o.label)}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label for="frCabang">Cabang</label>
      <select id="frCabang" name="tenant">${opsiCabang
        .map((o) => `<option value="${UI.escape(o.value)}"${o.value === f.tenant ? ' selected' : ''}>${UI.escape(o.label)}</option>`).join('')}</select>
    </div>
    <div class="field"><label for="frDari">Dari tanggal</label><input type="date" id="frDari" name="dari" value="${UI.escape(f.dari)}" /></div>
    <div class="field"><label for="frSampai">Sampai tanggal</label><input type="date" id="frSampai" name="sampai" value="${UI.escape(f.sampai)}" /></div>
    <div class="field">
      <label for="frJenis">Jenis</label>
      <select id="frJenis" name="jenis">${JENIS
        .map((j) => `<option value="${UI.escape(j.value)}"${j.value === f.jenis ? ' selected' : ''}>${UI.escape(j.label)}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label for="frAlasan">Alasan</label>
      <select id="frAlasan" name="alasan">${ALASAN
        .map((a) => `<option value="${UI.escape(a.value)}"${a.value === f.alasan ? ' selected' : ''}>${UI.escape(a.label)}</option>`).join('')}</select>
    </div>
    <div class="field"><label for="frCari">Cari no. / barang / kasir</label><input type="search" id="frCari" name="cari" value="${UI.escape(f.cari)}" placeholder="cth: RTR-2026" /></div>
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
      dari: params.get('dari') || (adaTanggal ? '' : tanggalJakarta(-30)),
      sampai: params.get('sampai') || (adaTanggal ? '' : tanggalJakarta(0)),
      jenis: params.get('jenis') || '',
      alasan: params.get('alasan') || '',
      cari: (params.get('cari') || '').trim(),
      offset: Math.max(0, Number(params.get('offset') || 0) || 0)
    };
    state.filters = filters;

    let tenantFilter = filters.tenant;
    if (!tenantFilter && filters.client) {
      const ids = Lookups.tenantsOf(filters.client).map((t) => t.id);
      tenantFilter = ids.length ? `in.(${ids.join(',')})` : 'in.()';
    }

    const kataKunci = filters.cari.replace(/[(),*%\\]/g, ' ');
    const jalur = 'stock_returns?select=tenant_id,no,at,cashier,kind,item_id,name,unit,qty,amount,reason,note,tenant:tenants(name,client_id)&order=at.desc'
      + q({
        'tenant_id!': tenantFilter,
        at: filters.dari ? `gte.${batasWaktu(filters.dari)}` : '',
        kind: filters.jenis,
        reason: filters.alasan,
        'or!': filters.cari ? `(no.ilike.*${kataKunci}*,name.ilike.*${kataKunci}*,cashier.ilike.*${kataKunci}*)` : ''
      })
      + (filters.sampai ? '&at=' + encodeURIComponent(`lte.${batasWaktu(filters.sampai, true)}`) : '');

    const hasil = await page(jalur, { from: filters.offset, to: filters.offset + LIMIT - 1 });

    if (!hasil.ok) {
      if (hasil.expired) { Auth.expired(); return UI.loading('Sesi berakhir. Mengarahkan ke login...'); }
      return barFilter(filters) + UI.errorBox(hasil.message);
    }

    state.total = hasil.total;
    state.rows = hasil.data;

    const totalNilai = hasil.data.reduce((t, r) => t + Number(r.amount || 0), 0);
    const totalQty = hasil.data.reduce((t, r) => t + Number(r.qty || 0), 0);

    const tabel = UI.table({
      columns: [
        { label: 'Waktu', render: (r) => UI.escape(formatDateTime(r.at)) },
        { label: 'No. retur', render: (r) => `<span class="mono">${UI.escape(r.no)}</span>` },
        { label: 'Cabang', render: (r) => {
            const nama = r.tenant ? r.tenant.name : r.tenant_id;
            const klien = r.tenant ? Lookups.clientName(r.tenant.client_id) : '-';
            return `${UI.escape(nama)}<span class="cell-sub">${UI.escape(klien)}</span>`;
          } },
        { label: 'Jenis', render: (r) => UI.badge(r.kind === 'pelanggan' ? 'Dari pelanggan' : 'Ke supplier', r.kind === 'pelanggan' ? 'ok' : 'warn') },
        { label: 'Barang', render: (r) => `${UI.escape(r.name)}<span class="cell-sub">${UI.escape(r.item_id)}</span>` },
        { label: 'Jumlah', align: 'num', render: (r) => `${formatNumber(r.qty)} ${UI.escape(r.unit)}` },
        { label: 'Nilai', align: 'num', render: (r) => formatRupiah(r.amount) },
        { label: 'Alasan', render: (r) => UI.escape(LABEL_ALASAN[r.reason] || r.reason) },
        { label: 'Kasir', render: (r) => UI.escape(r.cashier) },
        { label: 'Catatan', render: (r) => (r.note ? UI.escape(r.note) : '-') }
      ],
      rows: hasil.data,
      empty: 'Tidak ada retur pada periode/filter ini.'
    });

    return `${barFilter(filters)}
      <div class="stat-grid">
        ${UI.stat({ label: 'Retur (filter)', value: formatNumber(hasil.total) })}
        ${UI.stat({ label: 'Baris di halaman ini', value: formatNumber(hasil.data.length) })}
        ${UI.stat({ label: 'Total nilai di halaman', value: formatRupiah(totalNilai), note: `${formatNumber(totalQty)} unit` })}
      </div>
      ${UI.card({
        title: 'Riwayat retur',
        hint: 'Data hanya bisa dibaca -- retur dicatat lewat aplikasi POS.',
        body: tabel + UI.pager({ total: hasil.total, limit: LIMIT, offset: filters.offset })
      })}`;
  },

  init() {
    const form = document.getElementById('filterRetur');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        Router.go(HALAMAN, {
          client: form.querySelector('#frClient').value,
          tenant: form.querySelector('#frCabang').value,
          dari: form.querySelector('#frDari').value,
          sampai: form.querySelector('#frSampai').value,
          jenis: form.querySelector('#frJenis').value,
          alasan: form.querySelector('#frAlasan').value,
          cari: form.querySelector('#frCari').value.trim()
        });
      });
      const pilihClient = form.querySelector('#frClient');
      if (pilihClient) {
        pilihClient.addEventListener('change', () => {
          Router.go(HALAMAN, {
            client: pilihClient.value,
            dari: form.querySelector('#frDari').value,
            sampai: form.querySelector('#frSampai').value,
            jenis: form.querySelector('#frJenis').value,
            alasan: form.querySelector('#frAlasan').value,
            cari: form.querySelector('#frCari').value.trim()
          });
        });
      }
    }
    UI.bindPager(document.getElementById('pager'), { total: state.total, limit: LIMIT, offset: state.filters.offset }, (offset) => {
      Router.go(HALAMAN, {
        client: state.filters.client, tenant: state.filters.tenant, dari: state.filters.dari,
        sampai: state.filters.sampai, jenis: state.filters.jenis, alasan: state.filters.alasan,
        cari: state.filters.cari, offset
      });
    });
  },

  act(aksi) {
    if (aksi === 'bersihkan') { Router.go(HALAMAN, { dari: '', sampai: '' }); return; }
    if (aksi === 'csv') {
      if (!state.rows.length) { UI.toast('Tidak ada data untuk diunduh.', { type: 'warning' }); return; }
      const csv = toCsv(state.rows, [
        { label: 'waktu', value: (r) => r.at },
        { label: 'no', key: 'no' },
        { label: 'cabang_id', key: 'tenant_id' },
        { label: 'cabang', value: (r) => (r.tenant ? r.tenant.name : '') },
        { label: 'client', value: (r) => (r.tenant ? Lookups.clientName(r.tenant.client_id) : '') },
        { label: 'jenis', key: 'kind' },
        { label: 'barang', key: 'name' },
        { label: 'jumlah', key: 'qty' },
        { label: 'satuan', key: 'unit' },
        { label: 'nilai', key: 'amount' },
        { label: 'alasan', key: 'reason' },
        { label: 'kasir', key: 'cashier' },
        { label: 'catatan', key: 'note' }
      ]);
      downloadCsv(`retur-${tanggalJakarta(0)}.csv`, csv);
      UI.toast('CSV diunduh (hanya baris yang tampil).', { type: 'success' });
    }
  }
};