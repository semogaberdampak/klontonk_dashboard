import { rest, rpc } from '../supabase.js';
import { UI } from '../ui.js';
import { Auth } from '../auth.js';
import { Lookups } from '../lookups.js';
import { Router } from '../router.js';
import { formatNumber, formatRupiah, formatDate, daysLabel, subTone, toCsv, downloadCsv } from '../format.js';

// ============ PEMAKAIAN ============
// Aktivitas harian satu client: jumlah transaksi, omzet, retur, log audit, dan error teknis.
// Angkanya dihitung DATABASE lewat RPC usage_daily() (bukan di browser), sehingga tetap
// ringan walau data sudah menumpuk bertahun-tahun.

const HALAMAN = '/pemakaian';

let state = { client: '', dari: '', sampai: '', harian: [], klien: null, daftar: [] };

function tanggalJakarta(offsetHari = 0) {
  const d = new Date(Date.now() + offsetHari * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function barFilter(f) {
  return `<form class="filters" id="filterPemakaian">
    <div class="field grow">
      <label for="fpmClient">Client</label>
      <select id="fpmClient" name="client">
        <option value="">${UI.escape('Pilih client...')}</option>
        ${Lookups.clientOptions().map((o) => `<option value="${UI.escape(o.value)}"${o.value === f.client ? ' selected' : ''}>${UI.escape(o.label)}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label for="fpmDari">Dari</label><input type="date" id="fpmDari" name="dari" value="${UI.escape(f.dari)}" /></div>
    <div class="field"><label for="fpmSampai">Sampai</label><input type="date" id="fpmSampai" name="sampai" value="${UI.escape(f.sampai)}" /></div>
    <button type="submit" class="btn btn-primary">Terapkan</button>
    <button type="button" class="btn btn-secondary" data-act="30">30 hari</button>
    <button type="button" class="btn btn-secondary" data-act="90">90 hari</button>
    <button type="button" class="btn btn-secondary" data-act="csv" style="margin-left:auto">Unduh CSV</button>
  </form>`;
}

export default {
  async render(params) {
    const client = params.get('client') || '';
    const dari = params.get('dari') || tanggalJakarta(-29);
    const sampai = params.get('sampai') || tanggalJakarta(0);
    state = { client, dari, sampai, harian: [], klien: null, daftar: [] };

    const [overview, harian] = await Promise.all([
      rest('v_client_overview?select=*&order=name'),
      client ? rpc('usage_daily', { p_client: client, p_from: dari, p_to: sampai }) : Promise.resolve({ ok: true, data: [] })
    ]);

    if (!overview.ok) {
      if (overview.expired) { Auth.expired(); return UI.loading('Sesi berakhir. Mengarahkan ke login...'); }
      return barFilter(state) + UI.errorBox(overview.message);
    }

    state.daftar = overview.data;
    state.klien = overview.data.find((c) => c.id === client) || null;

    if (!client) {
      const tabelSemua = UI.table({
        columns: [
          { label: 'Client', render: (r) => `<span class="cell-strong">${UI.escape(r.name)}</span><span class="cell-sub">${UI.escape(r.id)}</span>` },
          { label: 'Cabang', align: 'num', key: 'branch_count' },
          { label: 'Pengguna', align: 'num', key: 'user_count' },
          { label: 'Trx 30 hari', align: 'num', render: (r) => formatNumber(r.trx_30d) },
          { label: 'Omzet 30 hari', align: 'num', render: (r) => formatRupiah(r.omzet_30d) },
          { label: 'Log 7 hari', align: 'num', render: (r) => formatNumber(r.logs_7d) },
          { label: 'Error 7 hari', align: 'num', render: (r) => (Number(r.errors_7d || 0) ? UI.badge(formatNumber(r.errors_7d), 'bad') : '0') },
          { label: 'Langganan', render: (r) => UI.badge(daysLabel(r.days_left), subTone(r.sub_status, r.days_left)) },
          { label: '', align: 'num', render: (r) => UI.actions([UI.btnAksi('Lihat pemakaian', { act: 'pilih', id: r.id })]) }
        ],
        rows: overview.data,
        empty: 'Belum ada client.'
      });
      return `${barFilter(state)}
        ${UI.card({ title: 'Pemakaian semua client (30 hari terakhir)', hint: 'Pilih client untuk melihat rincian harian.', body: tabelSemua })}`;
    }

    if (!harian.ok) {
      if (harian.expired) { Auth.expired(); return UI.loading('Sesi berakhir. Mengarahkan ke login...'); }
      return barFilter(state) + UI.errorBox(harian.message);
    }

    state.harian = harian.data || [];
    const k = state.klien || {};

    const total = state.harian.reduce((t, r) => ({
      trx: t.trx + Number(r.trx_count || 0),
      omzet: t.omzet + Number(r.trx_total || 0),
      retur: t.retur + Number(r.return_count || 0),
      nilaiRetur: t.nilaiRetur + Number(r.return_amount || 0),
      log: t.log + Number(r.log_count || 0),
      error: t.error + Number(r.event_count || 0)
    }), { trx: 0, omzet: 0, retur: 0, nilaiRetur: 0, log: 0, error: 0 });

    const tabel = UI.table({
      columns: [
        { label: 'Tanggal', render: (r) => UI.escape(formatDate(r.day)) },
        { label: 'Transaksi', align: 'num', render: (r) => formatNumber(r.trx_count) },
        { label: 'Omzet', align: 'num', render: (r) => formatRupiah(r.trx_total) },
        { label: 'Retur', align: 'num', render: (r) => formatNumber(r.return_count) },
        { label: 'Nilai retur', align: 'num', render: (r) => formatRupiah(r.return_amount) },
        { label: 'Log audit', align: 'num', render: (r) => formatNumber(r.log_count) },
        { label: 'Error', align: 'num', render: (r) => (Number(r.event_count || 0) ? UI.badge(formatNumber(r.event_count), 'bad') : '0') }
      ],
      rows: state.harian,
      empty: 'Tidak ada aktivitas pada periode ini.'
    });

    const info = UI.table({
      columns: [
        { label: 'Paket', render: () => `${UI.escape(k.plan_name || '-')}<span class="cell-sub">${UI.escape(k.plan_code || '')}</span>` },
        { label: 'Status client', render: () => UI.badge(k.status || '-', k.status === 'aktif' ? 'ok' : 'warn') },
        { label: 'Langganan', render: () => UI.badge(daysLabel(k.days_left), subTone(k.sub_status, k.days_left)) },
        { label: 'Cabang', align: 'num', render: () => formatNumber(k.branch_count) },
        { label: 'Pengguna', align: 'num', render: () => formatNumber(k.user_count) }
      ],
      rows: [k]
    });

    return `${barFilter(state)}
      <div class="stat-grid">
        ${UI.stat({ label: 'Transaksi', value: formatNumber(total.trx), note: `${state.dari} sd ${state.sampai}` })}
        ${UI.stat({ label: 'Omzet', value: formatRupiah(total.omzet) })}
        ${UI.stat({ label: 'Retur', value: formatNumber(total.retur), note: formatRupiah(total.nilaiRetur) })}
        ${UI.stat({ label: 'Log audit', value: formatNumber(total.log) })}
        ${UI.stat({ label: 'Error teknis', value: formatNumber(total.error), tone: total.error ? 'danger' : 'success' })}
      </div>
      ${UI.card({ title: `Client: ${k.name || client}`, body: info })}
      ${UI.card({ title: 'Aktivitas harian', hint: 'Dihitung database (RPC usage_daily).', body: tabel })}`;
  },

  init() {
    const form = document.getElementById('filterPemakaian');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        Router.go(HALAMAN, {
          client: form.querySelector('#fpmClient').value,
          dari: form.querySelector('#fpmDari').value,
          sampai: form.querySelector('#fpmSampai').value
        });
      });
      const pilihClient = form.querySelector('#fpmClient');
      if (pilihClient) {
        pilihClient.addEventListener('change', () => {
          Router.go(HALAMAN, {
            client: pilihClient.value,
            dari: form.querySelector('#fpmDari').value,
            sampai: form.querySelector('#fpmSampai').value
          });
        });
      }
    }
  },

  act(aksi, id) {
    if (aksi === 'pilih') { Router.go(HALAMAN, { client: id, dari: state.dari, sampai: state.sampai }); return; }
    if (aksi === '30' || aksi === '90') {
      const hari = Number(aksi) - 1;
      Router.go(HALAMAN, { client: state.client, dari: tanggalJakarta(-hari), sampai: tanggalJakarta(0) });
      return;
    }
    if (aksi === 'csv') {
      if (!state.harian.length) { UI.toast('Tidak ada data untuk diunduh.', { type: 'warning' }); return; }
      const csv = toCsv(state.harian, [
        { label: 'client', key: 'day' },
        { label: 'transaksi', key: 'trx_count' },
        { label: 'omzet', key: 'trx_total' },
        { label: 'retur', key: 'return_count' },
        { label: 'nilai_retur', key: 'return_amount' },
        { label: 'log_audit', key: 'log_count' },
        { label: 'error', key: 'event_count' }
      ]);
      downloadCsv(`pemakaian-${state.client}-${state.dari}-${state.sampai}.csv`, csv);
      UI.toast('CSV diunduh.', { type: 'success' });
    }
  }
};