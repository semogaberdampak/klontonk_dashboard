import { page, rest, pesanError } from '../supabase.js';
import { UI, q } from '../ui.js';
import { Auth } from '../auth.js';
import { Lookups } from '../lookups.js';
import { Router, reloadPage } from '../router.js';
import { formatNumber } from '../format.js';

// ============ CABANG (tenant) ============
// Satu cabang = satu tenant di aplikasi POS (T001, T002, ...).
// Hanya admin platform yang boleh menambah/mengubah cabang -- batas jumlah cabang
// ditentukan paket langganan dan ditegakkan oleh trigger di database.
// Cabang TIDAK BISA dihapus bila masih punya pengguna, stok, penjualan, atau retur.

const LIMIT = 25;
const HALAMAN = '/cabang';

let state = { filters: { client: '', cari: '', offset: 0 }, total: 0, rows: [] };

function barFilter(f) {
  return `<form class="filters" id="filterCabang">
    <div class="field">
      <label for="fcClient">Client</label>
      <select id="fcClient" name="client">${Lookups.clientOptions({ includeAll: true })
        .map((o) => `<option value="${UI.escape(o.value)}"${o.value === f.client ? ' selected' : ''}>${UI.escape(o.label)}</option>`).join('')}</select>
    </div>
    <div class="field grow">
      <label for="fcCari">Cari nama cabang</label>
      <input type="search" id="fcCari" name="cari" value="${UI.escape(f.cari)}" placeholder="cth: cabang 2" />
    </div>
    <button type="submit" class="btn btn-primary">Terapkan</button>
    <button type="button" class="btn btn-secondary" data-act="bersihkan">Bersihkan</button>
    <button type="button" class="btn btn-primary" data-act="tambah" style="margin-left:auto">+ Tambah cabang</button>
  </form>`;
}

// Hitung jumlah pengguna tiap cabang yang sedang tampil (satu query, bukan per cabang).
async function jumlahPengguna(tenantIds) {
  if (!tenantIds.length) return {};
  const hasil = await rest('profiles?select=tenant_id' + q({ 'tenant_id!': `in.(${tenantIds.join(',')})` }));
  if (!hasil.ok) return {};
  const peta = {};
  for (const baris of hasil.data) peta[baris.tenant_id] = (peta[baris.tenant_id] || 0) + 1;
  return peta;
}

function formTambah(f) {
  const opsiClient = Lookups.clientOptions({ status: 'aktif' });
  const saran = Lookups.tenantsOf(f.client || null).length;
  return UI.formModal({
    title: 'Tambah cabang',
    note: saran !== undefined ? 'Jumlah cabang dibatasi paket langganan client.' : '',
    submitText: 'Simpan cabang',
    fields: [
      { name: 'client', label: 'Client pemilik', type: 'select', required: true,
        options: opsiClient.length ? opsiClient : Lookups.clientOptions() },
      { name: 'nama', label: 'Nama cabang', required: true, placeholder: 'cth: Cabang Pasar', maxlength: 60,
        hint: 'ID cabang (T00x) dibuat otomatis oleh database.' }
    ],
    values: { client: f.client || (opsiClient[0] ? opsiClient[0].value : '') },
    onSubmit: async (nilai) => {
      const hasil = await rest('tenants', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: { client_id: nilai.client, name: nilai.nama }
      });
      if (!hasil.ok) return { success: false, error: pesanError(hasil) };
      const baru = Array.isArray(hasil.data) && hasil.data[0] ? hasil.data[0] : null;
      UI.toast(`Cabang ${baru ? baru.id + ' ' : ''}berhasil dibuat.`, { type: 'success' });
      Lookups.invalidate();
      reloadPage();
      return { success: true };
    }
  });
}

function formUbah(baris) {
  return UI.formModal({
    title: `Ubah cabang ${baris.id}`,
    submitText: 'Simpan perubahan',
    fields: [
      { name: 'nama', label: 'Nama cabang', required: true, maxlength: 60 }
    ],
    values: { nama: baris.name },
    onSubmit: async (nilai) => {
      const hasil = await rest(`tenants?id=eq.${encodeURIComponent(baris.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: { name: nilai.nama }
      });
      if (!hasil.ok) return { success: false, error: pesanError(hasil) };
      UI.toast('Nama cabang disimpan.', { type: 'success' });
      Lookups.invalidate();
      reloadPage();
      return { success: true };
    }
  });
}

export default {
  async render(params) {
    const filters = {
      client: params.get('client') || '',
      cari: (params.get('cari') || '').trim(),
      offset: Math.max(0, Number(params.get('offset') || 0) || 0)
    };
    state.filters = filters;

    const jalur = 'tenants?select=id,name,client_id&order=id' + q({
      client_id: filters.client,
      name: filters.cari ? `ilike.*${filters.cari}*` : ''
    });
    const hasil = await page(jalur, { from: filters.offset, to: filters.offset + LIMIT - 1 });

    if (!hasil.ok) {
      if (hasil.expired) { Auth.expired(); return UI.loading('Sesi berakhir. Mengarahkan ke login...'); }
      return barFilter(filters) + UI.errorBox(hasil.message);
    }

    state.total = hasil.total;
    state.rows = hasil.data;

    const pengguna = await jumlahPengguna(hasil.data.map((t) => t.id));

    const tabel = UI.table({
      columns: [
        { label: 'ID', render: (r) => `<span class="mono">${UI.escape(r.id)}</span>` },
        { label: 'Cabang', render: (r) => `<span class="cell-strong">${UI.escape(r.name)}</span>` },
        { label: 'Client', render: (r) => `${UI.escape(Lookups.clientName(r.client_id))}<span class="cell-sub">${UI.escape(r.client_id)}</span>` },
        { label: 'Pengguna', align: 'num', render: (r) => formatNumber(pengguna[r.id] || 0) },
        { label: '', align: 'num', render: (r) => UI.actions([
            UI.btnAksi('Ubah nama', { act: 'ubah', id: r.id }),
            UI.btnAksi('Pengguna', { act: 'pengguna', id: r.id }),
            UI.btnAksi('Hapus', { act: 'hapus', id: r.id })
          ]) }
      ],
      rows: hasil.data,
      empty: (filters.client || filters.cari) ? 'Tidak ada cabang yang cocok dengan filter.' : 'Belum ada cabang. Tambahkan cabang pertama.'
    });

    const totalCabang = Lookups.tenants().length;
    return `${barFilter(filters)}
      <div class="stat-grid">
        ${UI.stat({ label: 'Cabang terdaftar', value: formatNumber(totalCabang) })}
        ${UI.stat({ label: 'Client', value: formatNumber(Lookups.clients().length) })}
        ${UI.stat({ label: 'Hasil filter', value: formatNumber(hasil.total) })}
      </div>
      ${UI.card({
        title: `Daftar cabang (${formatNumber(hasil.total)})`,
        hint: 'ID cabang dipakai aplikasi POS sebagai penanda tenant.',
        body: tabel + UI.pager({ total: hasil.total, limit: LIMIT, offset: filters.offset })
      })}`;
  },

  init() {
    const form = document.getElementById('filterCabang');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        Router.go(HALAMAN, {
          client: form.querySelector('#fcClient').value,
          cari: form.querySelector('#fcCari').value.trim()
        });
      });
    }
    UI.bindPager(document.getElementById('pager'), { total: state.total, limit: LIMIT, offset: state.filters.offset }, (offset) => {
      Router.go(HALAMAN, { client: state.filters.client, cari: state.filters.cari, offset });
    });
  },

  async act(aksi, id) {
    if (aksi === 'tambah') { formTambah(state.filters); return; }
    if (aksi === 'bersihkan') { Router.go(HALAMAN); return; }

    const baris = state.rows.find((r) => r.id === id);
    if (!baris) return;

    if (aksi === 'ubah') { formUbah(baris); return; }
    if (aksi === 'pengguna') { Router.go('/pengguna', { client: baris.client_id, tenant: baris.id }); return; }

    if (aksi === 'hapus') {
      const yakin = await UI.modal({
        title: 'Hapus cabang',
        message: `Hapus cabang "${baris.name}" (${baris.id})? Cabang yang masih punya pengguna, stok, penjualan, atau retur akan ditolak oleh database -- itu pengaman agar data tidak hilang.`,
        icon: 'danger',
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        variant: 'danger'
      });
      if (!yakin) return;

      const hasil = await rest(`tenants?id=eq.${encodeURIComponent(baris.id)}`, { method: 'DELETE' });
      if (!hasil.ok) {
        const pesan = hasil.code === '23503' || hasil.status === 409
          ? 'Cabang tidak bisa dihapus karena masih memiliki data (pengguna/stok/penjualan/retur).'
          : pesanError(hasil);
        UI.toast(pesan, { type: 'danger', duration: 8000 });
        return;
      }
      UI.toast('Cabang dihapus.', { type: 'success' });
      Lookups.invalidate();
      reloadPage();
    }
  }
};