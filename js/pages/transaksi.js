import { page, pesanError } from '../supabase.js';
import { UI, q } from '../ui.js';
import { Auth } from '../auth.js';
import { Lookups } from '../lookups.js';
import { Router } from '../router.js';
import { formatNumber, formatRupiah, formatDateTime, toCsv, downloadCsv } from '../format.js';

// ============ TRANSAKSI (baca saja) ============
// Riwayat penjualan dari seluruh cabang. Data TIDAK bisa diubah dari dashboard -- memang
// disengaja: satu-satunya cara sah menambah penjualan adalah lewat kasir di POS (fungsi
// checkout()), supaya stok dan struk tetap konsisten.

const LIMIT = 50;
const HALAMAN = '/transaksi';

const METODE = [
  { value: '', label: 'Semua metode' },
  { value: 'tunai', label: 'Tunai' },
  { value: 'nontunai', label: 'Non-tunai' }
];

let state = { filters: {}, total: 0, rows: [] };

function tanggalJakarta(offsetHari = 0) {
  const d = new Date(Date.now() + offsetHari * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

// Batas hari (Jakarta) -> waktu ISO yang tepat, memakai offset +07:00 supaya tidak meleset.
function batasWaktu(tanggal, akhir = false) {
  if (!tanggal) return '';
  const jam = akhir ? '23:59:59.999' : '00:00:00.000';
  return new Date(`${tanggal}T${jam}+07:00`).toISOString();
}

function barFilter(f) {
  const opsiCabang = Lookups.tenantOptions({ clientId: f.client || null, includeAll: true, withClient: !f.client });
  return `<form class="filters" id="filterTransaksi">
    <div class="field">
      <label for="ftClient">Client</label>
      <select id="ftClient" name="client">${Lookups.clientOptions({ includeAll: true })
        .map((o) => `<option value="${UI.escape(o.value)}"${o.value === f.client ? ' selected' : ''}>${UI.escape(o.label)}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label for="ftCabang">Cabang</label>
      <select id="ftCabang" name="tenant">${opsiCabang
        .map((o) => `<option value="${UI.escape(o.value)}"${o.value === f.tenant ? ' selected' : ''}>${UI.escape(o.label)}</option>`).join('')}</select>
    </div>
    <div class="field"><label for="ftDari">Dari tanggal</label><input type="date" id="ftDari" name="dari" value="${UI.escape(f.dari)}" /></div>
    <div class="field"><label for="ftSampai">Sampai tanggal</label><input type="date" id="ftSampai" name="sampai" value="${UI.escape(f.sampai)}" /></div>
    <div class="field">
      <label for="ftMetode">Metode</label>
      <select id="ftMetode" name="metode">${METODE
        .map((m) => `<option value="${UI.escape(m.value)}"${m.value === f.metode ? ' selected' : ''}>${UI.escape(m.label)}</option>`).join('')}</select>
    </div>
    <div class="field"><label for="ftCari">Cari no. / kasir</label><input type="search" id="ftCari" name="cari" value="${UI.escape(f.cari)}" placeholder="cth: TRX-2026" /></div>
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
      metode: params.get('metode') || '',
      cari: (params.get('cari') || '').trim(),
      offset: Math.max(0, Number(params.get('offset') || 0) || 0)
    };
    state.filters = filters;

    let tenantFilter = filters.tenant;
    if (!tenantFilter && filters.client) {
      const ids = Lookups.tenantsOf(filters.client).map((t) => t.id);
      tenantFilter = ids.length ? `in.(${ids.join(',')})` : 'in.()';
    }

    const cabangTerpilih = filters.tenant ? Lookups.tenant(filters.tenant) : null;
    const namaCabang = cabangTerpilih ? cabangTerpilih.name : '';

    // Kata kunci dibersihkan dari karakter yang bisa merusak filter PostgREST.
    const kataKunci = filters.cari.replace(/[(),*%\\]/g, ' ');
    const jalur = 'sales?select=tenant_id,no,at,cashier,method,total,paid,tenant:tenants(name,client_id)&order=at.desc'
      + q({
        'tenant_id!': tenantFilter,
        at: filters.dari ? `gte.${batasWaktu(filters.dari)}` : '',
        method: filters.metode,
        'or!': filters.cari ? `(no.ilike.*${kataKunci}*,cashier.ilike.*${kataKunci}*)` : ''
      })
      + (filters.sampai ? '&at=' + encodeURIComponent(`lte.${batasWaktu(filters.sampai, true)}`) : '');

    const hasil = await page(jalur, { from: filters.offset, to: filters.offset + LIMIT - 1 });

    if (!hasil.ok) {
      if (hasil.expired) { Auth.expired(); return UI.loading('Sesi berakhir. Mengarahkan ke login...'); }
      return barFilter(filters) + UI.errorBox(hasil.message);
    }

    state.total = hasil.total;
    state.rows = hasil.data;

    const totalHalaman = hasil.data.reduce((t, r) => t + Number(r.total || 0), 0);
    const kembali = (r) => (r.method === 'tunai' ? Number(r.paid || 0) - Number(r.total || 0) : 0);

    const tabel = UI.table({
      columns: [
        { label: 'Waktu', render: (r) => UI.escape(formatDateTime(r.at)) },
        { label: 'No. transaksi', render: (r) => `<span class="mono">${UI.escape(r.no)}</span>` },
        { label: 'Cabang', render: (r) => {
            const nama = r.tenant ? r.tenant.name : r.tenant_id;
            const klien = r.tenant ? Lookups.clientName(r.tenant.client_id) : '-';
            return `${UI.escape(nama)}<span class="cell-sub">${UI.escape(klien)}</span>`;
          } },
        { label: 'Kasir', render: (r) => UI.escape(r.cashier) },
        { label: 'Metode', render: (r) => UI.badge(r.method === 'tunai' ? 'Tunai' : 'Non-tunai', r.method === 'tunai' ? '' : 'info') },
        { label: 'Total', align: 'num', render: (r) => formatRupiah(r.total) },
        { label: 'Dibayar', align: 'num', render: (r) => formatRupiah(r.paid) },
        { label: 'Kembali', align: 'num', render: (r) => formatRupiah(kembali(r)) }
      ],
      rows: hasil.data,
      empty: 'Tidak ada transaksi pada periode/filter ini.'
    });

    return `${barFilter(filters)}
      <div class="stat-grid">
        ${UI.stat({ label: 'Transaksi (filter)', value: formatNumber(hasil.total) })}
        ${UI.stat({ label: 'Total di halaman ini', value: formatRupiah(totalHalaman), note: `${formatNumber(hasil.data.length)} baris terlihat` })}
        ${UI.stat({ label: 'Periode', value: `${filters.dari || 'awal'} sd ${filters.sampai || 'sekarang'}`, note: 'waktu Asia/Jakarta' })}
      </div>
      ${UI.card({
        title: 'Riwayat penjualan',
        hint: namaCabang ? `Cabang: ${namaCabang}. Data hanya bisa dibaca.` : 'Data hanya bisa dibaca -- penjualan dicatat lewat kasir di POS.',
        body: tabel + UI.pager({ total: hasil.total, limit: LIMIT, offset: filters.offset })
      })}`;
  },

  init() {
    const form = document.getElementById('filterTransaksi');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        Router.go(HALAMAN, {
          client: form.querySelector('#ftClient').value,
          tenant: form.querySelector('#ftCabang').value,
          dari: form.querySelector('#ftDari').value,
          sampai: form.querySelector('#ftSampai').value,
          metode: form.querySelector('#ftMetode').value,
          cari: form.querySelector('#ftCari').value.trim()
        });
      });
      const pilihClient = form.querySelector('#ftClient');
      if (pilihClient) {
        pilihClient.addEventListener('change', () => {
          Router.go(HALAMAN, {
            client: pilihClient.value,
            dari: form.querySelector('#ftDari').value,
            sampai: form.querySelector('#ftSampai').value,
            metode: form.querySelector('#ftMetode').value,
            cari: form.querySelector('#ftCari').value.trim()
          });
        });
      }
    }
    UI.bindPager(document.getElementById('pager'), { total: state.total, limit: LIMIT, offset: state.filters.offset }, (offset) => {
      Router.go(HALAMAN, {
        client: state.filters.client, tenant: state.filters.tenant, dari: state.filters.dari,
        sampai: state.filters.sampai, metode: state.filters.metode, cari: state.filters.cari, offset
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
        { label: 'kasir', key: 'cashier' },
        { label: 'metode', key: 'method' },
        { label: 'total', key: 'total' },
        { label: 'dibayar', key: 'paid' }
      ]);
      downloadCsv(`transaksi-${tanggalJakarta(0)}.csv`, csv);
      UI.toast('CSV diunduh (hanya baris yang tampil).', { type: 'success' });
    }
  }
};