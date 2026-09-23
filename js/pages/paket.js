import { rest, pesanError } from '../supabase.js';
import { UI } from '../ui.js';
import { Auth } from '../auth.js';
import { Lookups } from '../lookups.js';
import { reloadPage } from '../router.js';
import { formatNumber, formatRupiah } from '../format.js';

// ============ PAKET ============
// Daftar paket langganan beserta batas cabang/pengguna. Batas ini DITEGAKKAN oleh trigger
// di database (check_plan_limit), bukan hanya di tampilan ini.

const KODE_POLA = /^[a-z0-9_]{2,20}$/;

function kolomForm(termasukKode) {
  const kolom = [];
  if (termasukKode) {
    kolom.push({ name: 'code', label: 'Kode paket', required: true, half: true, maxlength: 20,
      placeholder: 'cth: umkm_basic', hint: 'Huruf kecil/angka/underscore. Tidak bisa diubah setelah dibuat.' });
  }
  kolom.push({ name: 'name', label: 'Nama paket', required: true, half: true, maxlength: 40, placeholder: 'cth: UMKM Basic' });
  kolom.push({ name: 'price_month', label: 'Harga per bulan (Rp)', type: 'number', half: true, min: 0, max: 100000000 });
  kolom.push({ name: 'max_branches', label: 'Maksimal cabang', type: 'number', half: true, min: 1, max: 999 });
  kolom.push({ name: 'max_users', label: 'Maksimal pengguna', type: 'number', half: true, min: 1, max: 999 });
  kolom.push({ name: 'is_active', label: 'Paket aktif (boleh dipilih saat membuat client baru)', type: 'checkbox' });
  kolom.push({ name: 'note', label: 'Catatan', type: 'textarea', maxlength: 200 });
  return kolom;
}

function formTambah() {
  return UI.formModal({
    title: 'Tambah paket',
    submitText: 'Simpan paket',
    wide: true,
    fields: kolomForm(true),
    values: { price_month: 100000, max_branches: 1, max_users: 3, is_active: true },
    onSubmit: async (nilai) => {
      const kode = String(nilai.code || '').trim().toLowerCase();
      if (!KODE_POLA.test(kode)) return { success: false, error: 'Kode paket 2-20 karakter: huruf kecil, angka, underscore.' };
      const hasil = await rest('plans', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: {
          code: kode,
          name: nilai.name,
          price_month: Number(nilai.price_month) || 0,
          max_branches: Number(nilai.max_branches) || 1,
          max_users: Number(nilai.max_users) || 1,
          is_active: !!nilai.is_active,
          note: nilai.note || null
        }
      });
      if (!hasil.ok) return { success: false, error: pesanError(hasil) };
      UI.toast('Paket dibuat.', { type: 'success' });
      Lookups.invalidate();
      reloadPage();
      return { success: true };
    }
  });
}

function formUbah(paket) {
  return UI.formModal({
    title: `Ubah paket ${paket.code}`,
    submitText: 'Simpan perubahan',
    wide: true,
    fields: kolomForm(false),
    values: {
      name: paket.name,
      price_month: paket.price_month,
      max_branches: paket.max_branches,
      max_users: paket.max_users,
      is_active: paket.is_active,
      note: paket.note || ''
    },
    onSubmit: async (nilai) => {
      const hasil = await rest(`plans?code=eq.${encodeURIComponent(paket.code)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: {
          name: nilai.name,
          price_month: Number(nilai.price_month) || 0,
          max_branches: Number(nilai.max_branches) || 1,
          max_users: Number(nilai.max_users) || 1,
          is_active: !!nilai.is_active,
          note: nilai.note || null
        }
      });
      if (!hasil.ok) return { success: false, error: pesanError(hasil) };
      UI.toast('Paket diperbarui.', { type: 'success' });
      Lookups.invalidate();
      reloadPage();
      return { success: true };
    }
  });
}

export default {
  async render() {
    const [paket, ringkas] = await Promise.all([
      rest('plans?select=*&order=code'),
      rest('v_client_overview?select=id,plan_code')
    ]);

    if (!paket.ok) {
      if (paket.expired) { Auth.expired(); return UI.loading('Sesi berakhir. Mengarahkan ke login...'); }
      return UI.errorBox(paket.message);
    }

    const dipakai = {};
    if (ringkas.ok) {
      for (const c of ringkas.data) dipakai[c.plan_code] = (dipakai[c.plan_code] || 0) + 1;
    }

    const daftar = paket.data || [];
    const harga = daftar.map((p) => Number(p.price_month) || 0).filter((n) => n > 0);

    const tabel = UI.table({
      columns: [
        { label: 'Paket', render: (r) => `<span class="cell-strong">${UI.escape(r.name)}</span><span class="cell-sub">${UI.escape(r.code)}</span>` },
        { label: 'Harga / bulan', align: 'num', render: (r) => (Number(r.price_month) ? formatRupiah(r.price_month) : 'gratis') },
        { label: 'Maks cabang', align: 'num', key: 'max_branches' },
        { label: 'Maks pengguna', align: 'num', key: 'max_users' },
        { label: 'Status', render: (r) => UI.badge(r.is_active ? 'aktif' : 'nonaktif', r.is_active ? 'ok' : '') },
        { label: 'Dipakai', align: 'num', render: (r) => formatNumber(dipakai[r.code] || 0) },
        { label: 'Catatan', render: (r) => (r.note ? UI.escape(r.note) : '-') },
        { label: '', align: 'num', render: (r) => UI.actions([
            UI.btnAksi('Ubah', { act: 'ubah', id: r.code }),
            UI.btnAksi(r.is_active ? 'Nonaktifkan' : 'Aktifkan', { act: 'toggle', id: r.code }),
            UI.btnAksi('Hapus', { act: 'hapus', id: r.code })
          ]) }
      ],
      rows: daftar,
      empty: 'Belum ada paket. Tambahkan paket pertama.'
    });

    return `<div class="stat-grid">
        ${UI.stat({ label: 'Jumlah paket', value: formatNumber(daftar.length), note: `${formatNumber(daftar.filter((p) => p.is_active).length)} aktif` })}
        ${UI.stat({ label: 'Termurah', value: harga.length ? formatRupiah(Math.min(...harga)) : '-' })}
        ${UI.stat({ label: 'Termahal', value: harga.length ? formatRupiah(Math.max(...harga)) : '-' })}
      </div>
      <div class="filters">
        <span class="hint">Batas jumlah cabang dan pengguna ditegakkan oleh database saat client menambah cabang/pengguna.</span>
        <button type="button" class="btn btn-primary" data-act="tambah" style="margin-left:auto">+ Tambah paket</button>
      </div>
      ${UI.card({ title: 'Daftar paket', body: tabel })}`;
  },

  async act(aksi, id) {
    if (aksi === 'tambah') { formTambah(); return; }

    const daftar = Lookups.plans();
    const paket = daftar.find((p) => p.code === id);
    if (!paket) return;

    if (aksi === 'ubah') { formUbah(paket); return; }

    if (aksi === 'toggle') {
      const hasil = await rest(`plans?code=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { is_active: !paket.is_active }
      });
      if (!hasil.ok) { UI.toast(pesanError(hasil), { type: 'danger' }); return; }
      UI.toast(paket.is_active ? 'Paket dinonaktifkan.' : 'Paket diaktifkan.', { type: 'success' });
      Lookups.invalidate();
      reloadPage();
      return;
    }

    if (aksi === 'hapus') {
      const yakin = await UI.modal({
        title: 'Hapus paket',
        message: `Hapus paket "${paket.name}" (${paket.code})? Paket yang masih dipakai langganan akan ditolak oleh database.`,
        icon: 'danger', confirmText: 'Ya, Hapus', cancelText: 'Batal', variant: 'danger'
      });
      if (!yakin) return;
      const hasil = await rest(`plans?code=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!hasil.ok) {
        const pesan = hasil.code === '23503' || hasil.status === 409
          ? 'Paket tidak bisa dihapus karena masih dipakai oleh catatan langganan. Nonaktifkan saja.'
          : pesanError(hasil);
        UI.toast(pesan, { type: 'danger', duration: 8000 });
        return;
      }
      UI.toast('Paket dihapus.', { type: 'success' });
      Lookups.invalidate();
      reloadPage();
    }
  }
};