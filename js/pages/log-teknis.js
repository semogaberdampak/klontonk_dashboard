import { page, rest } from '../supabase.js';
import { UI, q } from '../ui.js';
import { Auth } from '../auth.js';
import { Lookups } from '../lookups.js';
import { Router } from '../router.js';
import { formatNumber, formatDateTime, relTime, toCsv, downloadCsv } from '../format.js';

// ============ LOG TEKNIS ============
// Error/peringatan yang dikirim dari perangkat client (tabel client_events).
// Isinya: pesan error aplikasi, gagal menyimpan ke database, versi aplikasi, dan jenis perangkat.
// Client boleh MENGIRIM dan MEMBACA lognya, tetapi tidak bisa mengubah atau menghapusnya.
//
// Catatan: aplikasi POS belum mengirim log ini secara otomatis. Sampai integrasi itu dipasang,
// tabel ini akan berisi data dari pemanggilan rpc('report_event', ...). Meski begitu, jejak
// perubahan data tetap tercatat di Log audit (trigger database) tanpa perlu mengubah POS.

const LIMIT = 50;
const HALAMAN = '/log-teknis';

const LEVEL = [
  { value: '', label: 'Semua level' },
  { value: 'error', label: 'Error' },
  { value: 'warn', label: 'Peringatan' },
  { value: 'info', label: 'Info' }
];

const TONE = { error: 'bad', warn: 'warn', info: 'info' };

let state = { filters: {}, total: 0, rows: [], hitung: { error: 0, warn: 0, info: 0 } };

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
  return `<form class="filters" id="filterTeknis">
    <div class="field">
      <label for="feLevel">Level</label>
      <select id="feLevel" name="level">${LEVEL
        .map((l) => `<option value="${UI.escape(l.value)}"${l.value === f.level ? ' selected' : ''}>${UI.escape(l.label)}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label for="feClient">Client</label>
      <select id="feClient" name="client">${Lookups.clientOptions({ includeAll: true })
        .map((o) => `<option value="${UI.escape(o.value)}"${o.value === f.client ? ' selected' : ''}>${UI.escape(o.label)}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label for="feCabang">Cabang</label>
      <select id="feCabang" name="tenant">${opsiCabang
        .map((o) => `<option value="${UI.escape(o.value)}"${o.value === f.tenant ? ' selected' : ''}>${UI.escape(o.label)}</option>`).join('')}</select>
    </div>
    <div class="field"><label for="feCari">Cari pesan</label><input type="search" id="feCari" name="cari" value="${UI.escape(f.cari)}" placeholder="cth: gagal simpan" /></div>
    <div class="field"><label for="feDari">Dari</label><input type="date" id="feDari" name="dari" value="${UI.escape(f.dari)}" /></div>
    <div class="field"><label for="feSampai">Sampai</label><input type="date" id="feSampai" name="sampai" value="${UI.escape(f.sampai)}" /></div>
    <button type="submit" class="btn btn-primary">Terapkan</button>
    <button type="button" class="btn btn-secondary" data-act="bersihkan">Bersihkan</button>
    <button type="button" class="btn btn-secondary" data-act="csv" style="margin-left:auto">Unduh CSV</button>
  </form>`;
}

export default {
  async render(params) {
    const adaTanggal = params.has('dari') || params.has('sampai');
    const filters = {
      level: params.get('level') || '',
      client: params.get('client') || '',
      tenant: params.get('tenant') || '',
      cari: (params.get('cari') || '').trim(),
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

    const dasar = {
      level: filters.level,
      at: filters.dari ? `gte.${batasWaktu(filters.dari)}` : '',
      message: filters.cari ? `ilike.*${filters.cari.replace(/[(),*%\\]/g, ' ')}*` : ''
    };

    const ekorClient = filters.client && !filters.tenant
      ? '&client_id=' + encodeURIComponent(filters.client)
      : '';
    const ekorSampai = filters.sampai ? '&at=' + encodeURIComponent(`lte.${batasWaktu(filters.sampai, true)}`) : '';

    const jalur = 'client_events?select=at,level,source,message,context,app_version,device,client_id,tenant_id&order=at.desc'
      + q({ 'tenant_id!': tenantFilter, ...dasar }) + ekorClient + ekorSampai;

    const [hasil, err, warn, info] = await Promise.all([
      page(jalur, { from: filters.offset, to: filters.offset + LIMIT - 1 }),
      page(`client_events?select=id&level=eq.error${ekorClient}${ekorSampai}`, { from: 0, to: 0 }),
      page(`client_events?select=id&level=eq.warn${ekorClient}${ekorSampai}`, { from: 0, to: 0 }),
      page(`client_events?select=id&level=eq.info${ekorClient}${ekorSampai}`, { from: 0, to: 0 })
    ]);

    if (!hasil.ok) {
      if (hasil.expired) { Auth.expired(); return UI.loading('Sesi berakhir. Mengarahkan ke login...'); }
      return barFilter(filters) + UI.errorBox(hasil.message);
    }

    state.total = hasil.total;
    state.rows = hasil.data;
    state.hitung = {
      error: err.ok ? err.total : 0,
      warn: warn.ok ? warn.total : 0,
      info: info.ok ? info.total : 0
    };

    const tabel = UI.table({
      columns: [
        { label: 'Waktu', render: (r) => `${UI.escape(relTime(r.at))}<span class="cell-sub">${UI.escape(formatDateTime(r.at))}</span>` },
        { label: 'Level', render: (r) => UI.badge(r.level.toUpperCase(), TONE[r.level] || '') },
        { label: 'Sumber', render: (r) => UI.escape(r.source) },
        { label: 'Pesan', render: (r) => `<span class="detail-cell">${UI.escape(r.message)}</span>` },
        { label: 'Cabang / client', render: (r) => {
            const bagian = [];
            if (r.tenant_id) bagian.push(Lookups.tenant(r.tenant_id) ? Lookups.tenant(r.tenant_id).name : r.tenant_id);
            if (r.client_id) bagian.push(Lookups.clientName(r.client_id));
            return UI.escape(bagian.join(' - ') || '-');
          } },
        { label: 'Versi / perangkat', render: (r) => `${UI.escape(r.app_version || '-')}<span class="cell-sub">${UI.escape(r.device || '')}</span>` },
        { label: '', align: 'num', render: (r) => UI.actions([UI.btnAksi('Detail', { act: 'detail', id: String(r.at) })]) }
      ],
      rows: hasil.data,
      empty: 'Tidak ada log teknis pada periode/filter ini.'
    });

    return `${barFilter(filters)}
      <div class="stat-grid">
        ${UI.stat({ label: 'Error', value: formatNumber(state.hitung.error), tone: state.hitung.error ? 'danger' : 'success' })}
        ${UI.stat({ label: 'Peringatan', value: formatNumber(state.hitung.warn), tone: state.hitung.warn ? 'warning' : '' })}
        ${UI.stat({ label: 'Info', value: formatNumber(state.hitung.info) })}
      </div>
      ${UI.card({
        title: 'Log teknis dari perangkat client',
        hint: 'Dikirim aplikasi POS lewat rpc(report_event). Belum otomatis -- lihat README bagian integrasi POS.',
        body: tabel + UI.pager({ total: hasil.total, limit: LIMIT, offset: filters.offset })
      })}`;
  },

  init() {
    const form = document.getElementById('filterTeknis');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        Router.go(HALAMAN, {
          level: form.querySelector('#feLevel').value,
          client: form.querySelector('#feClient').value,
          tenant: form.querySelector('#feCabang').value,
          cari: form.querySelector('#feCari').value.trim(),
          dari: form.querySelector('#feDari').value,
          sampai: form.querySelector('#feSampai').value
        });
      });
      const pilihClient = form.querySelector('#feClient');
      if (pilihClient) {
        pilihClient.addEventListener('change', () => {
          Router.go(HALAMAN, {
            level: form.querySelector('#feLevel').value,
            client: pilihClient.value,
            cari: form.querySelector('#feCari').value.trim(),
            dari: form.querySelector('#feDari').value,
            sampai: form.querySelector('#feSampai').value
          });
        });
      }
    }
    UI.bindPager(document.getElementById('pager'), { total: state.total, limit: LIMIT, offset: state.filters.offset }, (offset) => {
      Router.go(HALAMAN, {
        level: state.filters.level, client: state.filters.client, tenant: state.filters.tenant,
        cari: state.filters.cari, dari: state.filters.dari, sampai: state.filters.sampai, offset
      });
    });
  },

  async act(aksi, id) {
    if (aksi === 'bersihkan') { Router.go(HALAMAN, { dari: '', sampai: '' }); return; }

    if (aksi === 'csv') {
      if (!state.rows.length) { UI.toast('Tidak ada data untuk diunduh.', { type: 'warning' }); return; }
      const csv = toCsv(state.rows, [
        { label: 'waktu', key: 'at' },
        { label: 'level', key: 'level' },
        { label: 'sumber', key: 'source' },
        { label: 'pesan', key: 'message' },
        { label: 'client', key: 'client_id' },
        { label: 'cabang', key: 'tenant_id' },
        { label: 'versi', key: 'app_version' },
        { label: 'perangkat', key: 'device' }
      ]);
      downloadCsv(`log-teknis-${tanggalJakarta(0)}.csv`, csv);
      UI.toast('CSV diunduh (hanya baris yang tampil).', { type: 'success' });
      return;
    }

    if (aksi === 'detail') {
      const baris = state.rows.find((r) => String(r.at) === String(id));
      if (!baris) return;
      await UI.modal({
        title: `${baris.level.toUpperCase()} - ${baris.source}`,
        message: `Waktu: ${formatDateTime(baris.at)}\nClient: ${baris.client_id || '-'}\nCabang: ${baris.tenant_id || '-'}\nVersi aplikasi: ${baris.app_version || '-'}\nPerangkat: ${baris.device || '-'}\n\nPesan:\n${baris.message}\n\nKonteks:\n${JSON.stringify(baris.context, null, 2)}`,
        icon: baris.level === 'error' ? 'danger' : 'info',
        confirmText: 'Tutup'
      });
    }
  }
};