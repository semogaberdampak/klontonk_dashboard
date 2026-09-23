import { page, rest, pesanError } from '../supabase.js';
import { UI, q } from '../ui.js';
import { Auth } from '../auth.js';
import { Lookups } from '../lookups.js';
import { Router, reloadPage } from '../router.js';
import { formatNumber, formatRupiah, formatDate, daysLabel, subTone, subLabel } from '../format.js';

// ============ LANGGANAN ============
// Masa berlaku paket setiap client. Dua bagian:
//   1. Ringkasan keadaan sekarang (dari view v_client_overview -- dihitung database).
//   2. Riwayat langganan (tabel subscriptions) + perpanjangan.
// Catatan penting: yang benar-benar mengunci POS adalah trigger di database, bukan
// halaman ini. Jadi mengubah status di sini langsung berpengaruh ke client.

const LIMIT = 25;
const HALAMAN = '/langganan';
const PERPANJANG_HARI = 30;

const STATUS = [
  { value: '', label: 'Semua status' },
  { value: 'trial', label: 'Trial' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'jatuh_tempo', label: 'Jatuh tempo' },
  { value: 'berhenti', label: 'Berhenti' }
];

let state = { filters: { client: '', status: '', offset: 0 }, total: 0, rows: [], ringkas: [] };

function hariIni() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function tambahHari(tanggal, jumlah) {
  const d = new Date(tanggal + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + jumlah);
  return d.toISOString().slice(0, 10);
}

function barFilter(f) {
  return `<form class="filters" id="filterLangganan">
    <div class="field">
      <label for="flClient">Client</label>
      <select id="flClient" name="client">${Lookups.clientOptions({ includeAll: true })
        .map((o) => `<option value="${UI.escape(o.value)}"${o.value === f.client ? ' selected' : ''}>${UI.escape(o.label)}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label for="flStatus">Status</label>
      <select id="flStatus" name="status">${STATUS
        .map((s) => `<option value="${UI.escape(s.value)}"${s.value === f.status ? ' selected' : ''}>${UI.escape(s.label)}</option>`).join('')}</select>
    </div>
    <button type="submit" class="btn btn-primary">Terapkan</button>
    <button type="button" class="btn btn-secondary" data-act="bersihkan">Bersihkan</button>
    <button type="button" class="btn btn-secondary" data-act="sinkron">Sinkronkan status</button>
    <button type="button" class="btn btn-primary" data-act="tambah" style="margin-left:auto">+ Langganan baru</button>
  </form>`;
}

function statusOptions() {
  return [
    { value: 'trial', label: 'Trial' },
    { value: 'aktif', label: 'Aktif' },
    { value: 'jatuh_tempo', label: 'Jatuh tempo' },
    { value: 'berhenti', label: 'Berhenti' }
  ];
}

function formTambah(f) {
  const klien = Lookups.clientOptions();
  const paket = Lookups.planOptions({ activeOnly: true });
  return UI.formModal({
    title: 'Catat langganan',
    note: 'Gunakan untuk memperpanjang atau mengganti paket. Beberapa baris langganan boleh ada; yang dihitung sebagai berlaku adalah yang paling akhir masa berlakunya.',
    submitText: 'Simpan langganan',
    wide: true,
    fields: [
      { name: 'client', label: 'Client', type: 'select', required: true, options: klien },
      { name: 'paket', label: 'Paket', type: 'select', required: true, options: paket.length ? paket : [{ value: 'internal', label: 'Internal' }] },
      { name: 'mulai', label: 'Mulai', type: 'date', required: true, half: true },
      { name: 'berakhir', label: 'Berakhir', type: 'date', required: true, half: true },
      { name: 'status', label: 'Status', type: 'select', half: true, options: statusOptions() },
      { name: 'catatan', label: 'Catatan', half: true, maxlength: 200, placeholder: 'cth: pembayaran transfer 1 tahun' }
    ],
    values: {
      client: f.client || (klien[0] ? klien[0].value : ''),
      paket: paket[0] ? paket[0].value : 'internal',
      mulai: hariIni(),
      berakhir: tambahHari(hariIni(), PERPANJANG_HARI),
      status: 'aktif'
    },
    onSubmit: async (nilai) => {
      if (nilai.berakhir < nilai.mulai) return { success: false, error: 'Tanggal berakhir tidak boleh sebelum tanggal mulai.' };
      const hasil = await rest('subscriptions', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: {
          client_id: nilai.client,
          plan_code: nilai.paket,
          started_at: nilai.mulai,
          expires_at: nilai.berakhir,
          status: nilai.status,
          note: nilai.catatan || null
        }
      });
      if (!hasil.ok) return { success: false, error: pesanError(hasil) };
      UI.toast('Langganan disimpan.', { type: 'success' });
      Lookups.invalidate();
      reloadPage();
      return { success: true };
    }
  });
}

function formUbah(baris) {
  return UI.formModal({
    title: `Ubah langganan ${baris.client ? baris.client.name : baris.client_id}`,
    submitText: 'Simpan perubahan',
    wide: true,
    fields: [
      { name: 'paket', label: 'Paket', type: 'select', required: true,
        options: Lookups.planOptions({ activeOnly: true, includeInternal: true }) },
      { name: 'status', label: 'Status', type: 'select', half: true, options: statusOptions() },
      { name: 'berakhir', label: 'Berakhir', type: 'date', half: true, required: true },
      { name: 'catatan', label: 'Catatan', maxlength: 200 }
    ],
    values: { paket: baris.plan_code, status: baris.status, berakhir: baris.expires_at, catatan: baris.note || '' },
    onSubmit: async (nilai) => {
      if (nilai.berakhir < baris.started_at) return { success: false, error: 'Tanggal berakhir tidak boleh sebelum tanggal mulai.' };
      const hasil = await rest(`subscriptions?id=eq.${encodeURIComponent(baris.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: { plan_code: nilai.paket, status: nilai.status, expires_at: nilai.berakhir, note: nilai.catatan || null }
      });
      if (!hasil.ok) return { success: false, error: pesanError(hasil) };
      UI.toast('Langganan diperbarui.', { type: 'success' });
      reloadPage();
      return { success: true };
    }
  });
}

export default {
  async render(params) {
    const filters = {
      client: params.get('client') || '',
      status: params.get('status') || '',
      offset: Math.max(0, Number(params.get('offset') || 0) || 0)
    };
    state.filters = filters;

    const jalur = 'subscriptions?select=id,client_id,plan_code,started_at,expires_at,status,note,client:clients(name,status),plan:plans(name,price_month)&order=expires_at.desc'
      + q({ client_id: filters.client, status: filters.status });

    const [riwayat, ringkas] = await Promise.all([
      page(jalur, { from: filters.offset, to: filters.offset + LIMIT - 1 }),
      rest('v_client_overview?select=id,name,plan_code,plan_name,price_month,sub_status,days_left,expires_at&order=name')
    ]);

    if (!riwayat.ok) {
      if (riwayat.expired) { Auth.expired(); return UI.loading('Sesi berakhir. Mengarahkan ke login...'); }
      return barFilter(filters) + UI.errorBox(riwayat.message);
    }

    state.total = riwayat.total;
    state.rows = riwayat.data;
    state.ringkas = ringkas.ok ? ringkas.data : [];

    const berlaku = state.ringkas.filter((c) => (c.sub_status === 'trial' || c.sub_status === 'aktif') && Number(c.days_left) >= 0);
    const trial = berlaku.filter((c) => c.sub_status === 'trial');
    const perhatian = state.ringkas.filter((c) => c.days_left === null || c.days_left === undefined
      || Number(c.days_left) < 0
      || (Number(c.days_left) <= 14)
      || c.sub_status === 'berhenti');
    const potensi = berlaku.reduce((total, c) => total + Number(c.price_month || 0), 0);

    const tabelRingkas = UI.table({
      columns: [
        { label: 'Client', render: (r) => `<span class="cell-strong">${UI.escape(r.name)}</span><span class="cell-sub">${UI.escape(r.id)}</span>` },
        { label: 'Paket', render: (r) => (r.plan_name ? UI.escape(r.plan_name) : '-') },
        { label: 'Harga / bulan', align: 'num', render: (r) => (r.price_month ? formatRupiah(r.price_month) : '-') },
        { label: 'Berakhir', render: (r) => UI.escape(formatDate(r.expires_at)) },
        { label: 'Sisa', render: (r) => UI.badge(daysLabel(r.days_left), subTone(r.sub_status, r.days_left)) },
        { label: '', align: 'num', render: (r) => UI.actions([UI.btnAksi('Riwayat', { act: 'riwayat', id: r.id })]) }
      ],
      rows: perhatian,
      empty: 'Semua langganan client masih jauh dari jatuh tempo.'
    });

    const tabelRiwayat = UI.table({
      columns: [
        { label: 'Client', render: (r) => `${UI.escape(r.client ? r.client.name : r.client_id)}<span class="cell-sub">${UI.escape(r.client_id)}</span>` },
        { label: 'Paket', render: (r) => `${UI.escape(r.plan ? r.plan.name : r.plan_code)}<span class="cell-sub">${UI.escape(r.plan_code)}</span>` },
        { label: 'Mulai', render: (r) => UI.escape(formatDate(r.started_at)) },
        { label: 'Berakhir', render: (r) => UI.escape(formatDate(r.expires_at)) },
        { label: 'Status', render: (r) => UI.badge(r.status, subTone(r.status, 1)) },
        { label: 'Catatan', render: (r) => (r.note ? UI.escape(r.note) : '-') },
        { label: '', align: 'num', render: (r) => UI.actions([
            UI.btnAksi('Ubah', { act: 'ubah', id: r.id }),
            UI.btnAksi('+30 hari', { act: 'perpanjang', id: r.id, title: 'Perpanjang 30 hari dari tanggal berakhir / hari ini' }),
            UI.btnAksi('Hapus', { act: 'hapus', id: r.id })
          ]) }
      ],
      rows: riwayat.data,
      empty: 'Belum ada catatan langganan.'
    });

    return `${barFilter(filters)}
      <div class="stat-grid">
        ${UI.stat({ label: 'Klien berlangganan', value: formatNumber(berlaku.length), note: `${formatNumber(trial.length)} masih trial` })}
        ${UI.stat({ label: 'Potensi / bulan', value: formatRupiah(potensi), note: 'dari paket yang berlaku' })}
        ${UI.stat({ label: 'Perlu perhatian', value: formatNumber(perhatian.length), tone: perhatian.length ? 'warning' : 'success' })}
      </div>
      ${UI.card({ title: 'Langganan perlu perhatian', hint: 'Termasuk yang belum punya langganan sama sekali.', body: tabelRingkas })}
      ${UI.card({
        title: `Riwayat langganan (${formatNumber(riwayat.total)})`,
        hint: 'Yang berlaku adalah baris dengan masa berakhir paling akhir.',
        body: tabelRiwayat + UI.pager({ total: riwayat.total, limit: LIMIT, offset: filters.offset })
      })}`;
  },

  init() {
    const form = document.getElementById('filterLangganan');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        Router.go(HALAMAN, { client: form.querySelector('#flClient').value, status: form.querySelector('#flStatus').value });
      });
    }
    UI.bindPager(document.getElementById('pager'), { total: state.total, limit: LIMIT, offset: state.filters.offset }, (offset) => {
      Router.go(HALAMAN, { client: state.filters.client, status: state.filters.status, offset });
    });
  },

  async act(aksi, id) {
    if (aksi === 'tambah') { formTambah(state.filters); return; }
    if (aksi === 'bersihkan') { Router.go(HALAMAN); return; }
    if (aksi === 'riwayat') { Router.go(HALAMAN, { client: id }); return; }

    if (aksi === 'sinkron') {
      const yakin = await UI.modal({
        title: 'Sinkronkan status langganan',
        message: 'Semua langganan trial/aktif yang masa berlakunya sudah lewat akan ditandai "jatuh tempo". Lanjutkan?',
        icon: 'warning', confirmText: 'Ya, Sinkronkan', cancelText: 'Batal', variant: 'primary'
      });
      if (!yakin) return;
      const hasil = await rest(`subscriptions?expires_at=lt.${hariIni()}&status=in.(trial,aktif)`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: { status: 'jatuh_tempo' }
      });
      if (!hasil.ok) { UI.toast(pesanError(hasil), { type: 'danger' }); return; }
      const jumlah = Array.isArray(hasil.data) ? hasil.data.length : 0;
      UI.toast(jumlah ? `${jumlah} langganan ditandai jatuh tempo.` : 'Tidak ada langganan yang perlu diubah.', { type: jumlah ? 'success' : 'info' });
      reloadPage();
      return;
    }

    const baris = state.rows.find((r) => String(r.id) === String(id));
    if (!baris) return;

    if (aksi === 'ubah') { formUbah(baris); return; }

    if (aksi === 'perpanjang') {
      const dasar = baris.expires_at && baris.expires_at >= hariIni() ? baris.expires_at : hariIni();
      const baru = tambahHari(dasar, PERPANJANG_HARI);
      const yakin = await UI.modal({
        title: 'Perpanjang langganan',
        message: `Perpanjang sampai ${formatDate(baru)} (+${PERPANJANG_HARI} hari) dan tandai aktif?`,
        icon: 'info', confirmText: 'Ya, Perpanjang', cancelText: 'Batal', variant: 'primary'
      });
      if (!yakin) return;
      const hasil = await rest(`subscriptions?id=eq.${encodeURIComponent(baris.id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { expires_at: baru, status: 'aktif' }
      });
      if (!hasil.ok) { UI.toast(pesanError(hasil), { type: 'danger' }); return; }
      UI.toast(`Langganan diperpanjang sampai ${formatDate(baru)}.`, { type: 'success' });
      reloadPage();
      return;
    }

    if (aksi === 'hapus') {
      const yakin = await UI.modal({
        title: 'Hapus catatan langganan',
        message: 'Catatan langganan ini akan dihapus. Tindakan ini tercatat di log audit. Lanjutkan?',
        icon: 'danger', confirmText: 'Ya, Hapus', cancelText: 'Batal', variant: 'danger'
      });
      if (!yakin) return;
      const hasil = await rest(`subscriptions?id=eq.${encodeURIComponent(baris.id)}`, { method: 'DELETE' });
      if (!hasil.ok) { UI.toast(pesanError(hasil), { type: 'danger' }); return; }
      UI.toast('Catatan langganan dihapus.', { type: 'success' });
      reloadPage();
    }
  }
};