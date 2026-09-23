import { page, rest, rpc, pesanError } from '../supabase.js';
import { UI, q } from '../ui.js';
import { Auth } from '../auth.js';
import { Lookups } from '../lookups.js';
import { Router, reloadPage } from '../router.js';
import { formatNumber, formatRupiah, daysLabel, subTone } from '../format.js';

// ============ KLIEN (pelanggan berlangganan) ============
// Sumber data: view v_client_overview -- angka cabang/pengguna/transaksi/omzet dihitung
// di database, sehingga angkanya konsisten dengan halaman Ringkasan dan Pemakaian.
// Pembuatan client memakai RPC create_client_with_plan() agar client + langganan trial
// dibuat dalam satu transaksi (tidak mungkin setengah jadi).

const LIMIT = 25;
const HALAMAN = '/klien';

const STATUS = [
  { value: '', label: 'Semua status' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'suspend', label: 'Suspend' },
  { value: 'berhenti', label: 'Berhenti' }
];

const statusTone = (s) => (s === 'aktif' ? 'ok' : s === 'suspend' ? 'warn' : 'bad');

// Filter yang tampil di URL -> bisa dibagikan/di-bookmark.
let state = { filters: { cari: '', status: '', offset: 0 }, total: 0, rows: [] };

function barFilter(f) {
  return `<form class="filters" id="filterKlien">
    <div class="field grow">
      <label for="fkCari">Cari nama client</label>
      <input type="search" id="fkCari" name="cari" value="${UI.escape(f.cari)}" placeholder="cth: warung" />
    </div>
    <div class="field">
      <label for="fkStatus">Status</label>
      <select id="fkStatus" name="status">
        ${STATUS.map((s) => `<option value="${UI.escape(s.value)}"${s.value === f.status ? ' selected' : ''}>${UI.escape(s.label)}</option>`).join('')}
      </select>
    </div>
    <button type="submit" class="btn btn-primary">Terapkan</button>
    <button type="button" class="btn btn-secondary" data-act="bersihkan">Bersihkan</button>
    <button type="button" class="btn btn-primary" data-act="tambah" style="margin-left:auto">+ Tambah client</button>
  </form>`;
}

function fieldPaket() {
  const opsi = Lookups.planOptions({ excludeInternal: true });
  return opsi.length ? opsi : [{ value: 'internal', label: 'Internal (non-langganan)' }];
}

function formTambah() {
  return UI.formModal({
    title: 'Tambah client',
    note: 'Client + langganan trial dibuat sekaligus. Cabang dan akun dibuat setelah ini.',
    submitText: 'Simpan client',
    wide: true,
    fields: [
      { name: 'nama', label: 'Nama client / usaha', required: true, placeholder: 'cth: Warung Bu Sari', maxlength: 80 },
      { name: 'paket', label: 'Paket awal', type: 'select', required: true, options: fieldPaket(), half: true },
      { name: 'trial', label: 'Masa trial (hari)', type: 'number', half: true, min: 0, max: 365, hint: 'Isi 0 untuk langsung berstatus aktif.' },
      { name: 'kontak_nama', label: 'Nama kontak', placeholder: 'cth: Bu Sari', half: true, maxlength: 60 },
      { name: 'kontak_telepon', label: 'Telepon / WhatsApp', placeholder: 'cth: 081234567890', half: true, maxlength: 24 },
      { name: 'kontak_email', label: 'Email kontak', type: 'email', placeholder: 'cth: sari@contoh.com', maxlength: 80 },
      { name: 'catatan', label: 'Catatan', type: 'textarea', maxlength: 200 }
    ],
    values: { paket: fieldPaket()[0] ? fieldPaket()[0].value : '', trial: 14 },
    onSubmit: async (nilai) => {
      const hasil = await rpc('create_client_with_plan', {
        p_name: nilai.nama,
        p_plan_code: nilai.paket,
        p_contact_name: nilai.kontak_nama || null,
        p_contact_phone: nilai.kontak_telepon || null,
        p_contact_email: nilai.kontak_email || null,
        p_trial_days: Number(nilai.trial) || 0,
        p_note: nilai.catatan || null
      });
      if (!hasil.ok) return { success: false, error: pesanError(hasil) };
      UI.toast(`Client "${nilai.nama}" dibuat.`, { type: 'success' });
      Lookups.invalidate();
      reloadPage();
      return { success: true };
    }
  });
}

function formUbah(baris) {
  return UI.formModal({
    title: `Ubah client ${baris.id}`,
    submitText: 'Simpan perubahan',
    wide: true,
    fields: [
      { name: 'nama', label: 'Nama client / usaha', required: true, maxlength: 80 },
      { name: 'status', label: 'Status client', type: 'select', half: true,
        options: [
          { value: 'aktif', label: 'Aktif (bisa memakai POS)' },
          { value: 'suspend', label: 'Suspend (tidak dihentikan permanen)' },
          { value: 'berhenti', label: 'Berhenti (tidak berlangganan lagi)' }
        ] },
      { name: 'kontak_nama', label: 'Nama kontak', half: true, maxlength: 60 },
      { name: 'kontak_telepon', label: 'Telepon / WhatsApp', half: true, maxlength: 24 },
      { name: 'kontak_email', label: 'Email kontak', type: 'email', half: true, maxlength: 80 },
      { name: 'catatan', label: 'Catatan', type: 'textarea', maxlength: 200 }
    ],
    values: {
      nama: baris.name, status: baris.status, kontak_nama: baris.contact_name || '',
      kontak_telepon: baris.contact_phone || '', kontak_email: baris.contact_email || '',
      catatan: baris.note || ''
    },
    onSubmit: async (nilai) => {
      const hasil = await rest(`clients?id=eq.${encodeURIComponent(baris.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: {
          name: nilai.nama,
          status: nilai.status,
          contact_name: nilai.kontak_nama || null,
          contact_phone: nilai.kontak_telepon || null,
          contact_email: nilai.kontak_email || null,
          note: nilai.catatan || null
        }
      });
      if (!hasil.ok) return { success: false, error: pesanError(hasil) };
      UI.toast('Perubahan client disimpan.', { type: 'success' });
      Lookups.invalidate();
      reloadPage();
      return { success: true };
    }
  });
}

export default {
  async render(params) {
    const filters = {
      cari: (params.get('cari') || '').trim(),
      status: params.get('status') || '',
      offset: Math.max(0, Number(params.get('offset') || 0) || 0)
    };
    state.filters = filters;

    const jalur = 'v_client_overview?select=*&order=name' + q({
      name: filters.cari ? `ilike.*${filters.cari}*` : '',
      status: filters.status
    });
    const hasil = await page(jalur, { from: filters.offset, to: filters.offset + LIMIT - 1 });

    if (!hasil.ok) {
      if (hasil.expired) { Auth.expired(); return UI.loading('Sesi berakhir. Mengarahkan ke login...'); }
      return barFilter(filters) + UI.errorBox(hasil.message);
    }

    state.total = hasil.total;
    state.rows = hasil.data;

    const tabel = UI.table({
      columns: [
        { label: 'Client', render: (r) => `<span class="cell-strong">${UI.escape(r.name)}</span><span class="cell-sub">${UI.escape(r.id)}</span>` },
        { label: 'Kontak', render: (r) => {
            const kontak = [r.contact_name, r.contact_phone].filter(Boolean).join(' / ');
            return kontak ? UI.escape(kontak) : '<span class="cell-sub">belum diisi</span>';
          } },
        { label: 'Status', render: (r) => UI.badge(r.status, statusTone(r.status)) },
        { label: 'Paket', render: (r) => (r.plan_name ? `${UI.escape(r.plan_name)}<span class="cell-sub">${UI.escape(r.plan_code)}</span>` : '-') },
        { label: 'Langganan', render: (r) => UI.badge(daysLabel(r.days_left), subTone(r.sub_status, r.days_left)) },
        { label: 'Cabang', align: 'num', key: 'branch_count' },
        { label: 'Pengguna', align: 'num', key: 'user_count' },
        { label: 'Omzet 30 hari', align: 'num', render: (r) => formatRupiah(r.omzet_30d) },
        { label: '', align: 'num', render: (r) => UI.actions([
            UI.btnAksi('Ubah', { act: 'ubah', id: r.id }),
            UI.btnAksi('Cabang', { act: 'cabang', id: r.id }),
            UI.btnAksi('Langganan', { act: 'langganan', id: r.id }),
            r.status === 'aktif'
              ? UI.btnAksi('Nonaktifkan', { act: 'suspend', id: r.id, title: 'Tandai client tidak aktif' })
              : UI.btnAksi('Aktifkan', { act: 'aktifkan', id: r.id, title: 'Tandai client aktif kembali' })
          ]) }
      ],
      rows: hasil.data,
      empty: filters.cari || filters.status ? 'Tidak ada client yang cocok dengan filter.' : 'Belum ada client. Tambahkan client pertama.'
    });

    return `${barFilter(filters)}
      ${UI.card({
        title: `Daftar client (${formatNumber(hasil.total)})`,
        hint: 'Angka cabang, pengguna, dan omzet dihitung oleh database.',
        body: tabel + UI.pager({ total: hasil.total, limit: LIMIT, offset: filters.offset })
      })}`;
  },

  init() {
    const form = document.getElementById('filterKlien');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const cari = form.querySelector('#fkCari').value.trim();
        const status = form.querySelector('#fkStatus').value;
        Router.go(HALAMAN, { cari, status });
      });
    }
    UI.bindPager(document.getElementById('pager'), { total: state.total, limit: LIMIT, offset: state.filters.offset }, (offset) => {
      Router.go(HALAMAN, { cari: state.filters.cari, status: state.filters.status, offset });
    });
  },

  async act(aksi, id) {
    if (aksi === 'tambah') { formTambah(); return; }
    if (aksi === 'bersihkan') { Router.go(HALAMAN); return; }

    const baris = state.rows.find((r) => r.id === id);
    if (!baris) return;

    if (aksi === 'ubah') { formUbah(baris); return; }
    if (aksi === 'cabang') { Router.go('/cabang', { client: id }); return; }
    if (aksi === 'langganan') { Router.go('/langganan', { client: id }); return; }

    if (aksi === 'suspend' || aksi === 'aktifkan') {
      const statusBaru = aksi === 'suspend' ? 'suspend' : 'aktif';
      const yakin = await UI.modal({
        title: aksi === 'suspend' ? 'Nonaktifkan client' : 'Aktifkan client',
        message: aksi === 'suspend'
          ? 'Client ini ditandai suspend. Catatan: menulis data di POS tetap dikendalikan masa langganan, bukan status ini.'
          : 'Client ini akan ditandai aktif kembali.',
        icon: 'warning',
        confirmText: 'Lanjutkan',
        cancelText: 'Batal',
        variant: aksi === 'suspend' ? 'danger' : 'primary'
      });
      if (!yakin) return;
      const hasil = await rest(`clients?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { status: statusBaru }
      });
      if (!hasil.ok) { UI.toast(pesanError(hasil), { type: 'danger' }); return; }
      UI.toast('Status client diperbarui.', { type: 'success' });
      reloadPage();
    }
  }
};