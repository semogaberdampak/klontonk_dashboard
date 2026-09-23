import { page, rest, rpc, signUpDetached, pesanError } from '../supabase.js';
import { UI, q } from '../ui.js';
import { Auth } from '../auth.js';
import { Lookups } from '../lookups.js';
import { Router, reloadPage } from '../router.js';
import { formatDate, initialOf } from '../format.js';
import { EMAIL_DOMAIN } from '../config.js';

// ============ AKUN CLIENT ============
// Akun ini dipakai untuk login ke APLIKASI POS memakai USERNAME (bukan email): aplikasi POS
// memetakan username -> <username>@{EMAIL_DOMAIN}.
//
// Username unik GLOBAL di database, jadi selalu pakai awalan kode client (cth: c0001.budi)
// agar tidak bertabrakan dengan client lain.
//
// Penting: buat akun hanya setelah client + cabang + langganan siap, karena trigger batas
// paket (max_users) akan menolak bila kuota pengguna sudah habis.

const LIMIT = 25;
const HALAMAN = '/pengguna';
const USERNAME_POLA = /^[a-z0-9_.]{3,24}$/;

let state = { filters: { client: '', tenant: '', cari: '', offset: 0 }, total: 0, rows: [] };

// Karakter yang bisa merusak filter PostgREST dibuang dari kata kunci pencarian.
const bersihkan = (teks) => String(teks || '').replace(/[(),*%\\]/g, ' ').trim();

function barFilter(f) {
  const opsiCabang = Lookups.tenantOptions({ clientId: f.client || null, includeAll: true, withClient: !f.client });
  return `<form class="filters" id="filterPengguna">
    <div class="field">
      <label for="fpClient">Client</label>
      <select id="fpClient" name="client">${Lookups.clientOptions({ includeAll: true })
        .map((o) => `<option value="${UI.escape(o.value)}"${o.value === f.client ? ' selected' : ''}>${UI.escape(o.label)}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label for="fpCabang">Cabang</label>
      <select id="fpCabang" name="tenant">${opsiCabang
        .map((o) => `<option value="${UI.escape(o.value)}"${o.value === f.tenant ? ' selected' : ''}>${UI.escape(o.label)}</option>`).join('')}</select>
    </div>
    <div class="field grow">
      <label for="fpCari">Cari username / nama</label>
      <input type="search" id="fpCari" name="cari" value="${UI.escape(f.cari)}" placeholder="cth: c0001.budi" />
    </div>
    <button type="submit" class="btn btn-primary">Terapkan</button>
    <button type="button" class="btn btn-secondary" data-act="bersihkan">Bersihkan</button>
    <button type="button" class="btn btn-primary" data-act="tambah" style="margin-left:auto">+ Buat akun</button>
  </form>`;
}

function formTambah(f) {
  const opsiClient = Lookups.clientOptions();
  const clientTerpilih = f.client || (opsiClient[0] ? opsiClient[0].value : '');
  const opsiCabang = Lookups.tenantOptions({ clientId: clientTerpilih });
  const awalan = clientTerpilih ? clientTerpilih.toLowerCase() + '.' : '';

  return UI.formModal({
    title: 'Buat akun client',
    note: `Akun langsung bisa dipakai login di aplikasi POS memakai username. Pastikan Authentication -> Providers -> Email -> "Confirm email" sudah DIMATIKAN, supaya akun baru tidak menunggu konfirmasi email (${EMAIL_DOMAIN} tidak menerima surat).`,
    submitText: 'Buat akun',
    wide: true,
    fields: [
      { name: 'client', label: 'Client', type: 'select', required: true, options: opsiClient },
      { name: 'tenant', label: 'Cabang', type: 'select', required: true, options: opsiCabang.length ? opsiCabang : [{ value: '', label: 'Belum ada cabang -- buat cabang dulu' }],
        hint: 'Akun kasir hanya bisa mengakses cabang ini.' },
      { name: 'name', label: 'Nama lengkap', required: true, half: true, maxlength: 60, placeholder: 'cth: Budi Kasir' },
      { name: 'username', label: 'Username', required: true, half: true, maxlength: 24, spellcheck: false,
        placeholder: awalan + 'budi', hint: '3-24 karakter: huruf kecil, angka, titik, underscore. Awali dengan kode client.' },
      { name: 'password', label: 'Password', type: 'password', required: true, half: true, maxlength: 128,
        hint: 'Minimal 8 karakter, mengandung huruf dan angka.' },
      { name: 'role', label: 'Peran', type: 'select', half: true,
        options: [{ value: 'cashier', label: 'Kasir' }, { value: 'admin', label: 'Admin (boleh mengurus akun client sendiri)' }] }
    ],
    values: { client: clientTerpilih, tenant: opsiCabang.length ? opsiCabang[0].value : '', role: 'cashier', username: awalan },
    onSubmit: async (nilai) => {
      const uname = String(nilai.username || '').trim().toLowerCase();
      const nama = String(nilai.name || '').trim();
      const sandi = nilai.password || '';

      if (!USERNAME_POLA.test(uname)) return { success: false, error: 'Username 3-24 karakter: huruf kecil, angka, titik, underscore.' };
      if (!nilai.tenant) return { success: false, error: 'Pilih cabang lebih dulu (client belum punya cabang?).' };
      if (sandi.length < 8) return { success: false, error: 'Password minimal 8 karakter.' };
      if (!/[A-Za-z]/.test(sandi) || !/[0-9]/.test(sandi)) return { success: false, error: 'Password harus mengandung huruf dan angka.' };
      if (sandi.toLowerCase().includes(uname)) return { success: false, error: 'Password tidak boleh mengandung username.' };

      const terpakai = await rest(`profiles?select=id&username=eq.${encodeURIComponent(uname)}&limit=1`);
      if (!terpakai.ok) return { success: false, error: pesanError(terpakai) };
      if (terpakai.data.length) return { success: false, error: 'Username sudah dipakai. Pakai nama lain.' };

      const daftar = await signUpDetached(`${uname}@${EMAIL_DOMAIN}`, sandi);
      if (!daftar.ok) {
        if (daftar.code === 'user_already_exists' || daftar.status === 422 || /duplicate|already|sudah/i.test(daftar.message || '')) {
          return { success: false, error: 'Username ini sudah pernah dipakai di sistem autentikasi. Pakai nama lain.' };
        }
        return { success: false, error: pesanError(daftar) };
      }

      const profil = await rest('profiles', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: {
          id: daftar.data.user.id,
          username: uname,
          name: nama,
          role: nilai.role,
          avatar: initialOf(nama),
          tenant_id: nilai.tenant
        }
      });
      if (!profil.ok) return { success: false, error: pesanError(profil) };

      UI.toast(`Akun "${uname}" dibuat. Client bisa login ke POS memakai username itu.`, { type: 'success', duration: 7000 });
      reloadPage();
      return { success: true };
    }
  });
}

function formUbah(baris) {
  const opsiCabang = Lookups.tenantOptions({ clientId: Lookups.tenant(baris.tenant_id) ? Lookups.tenant(baris.tenant_id).client_id : null });
  return UI.formModal({
    title: `Ubah akun @${baris.username}`,
    note: 'Username (dipakai untuk login) tidak dapat diubah. Bila perlu username baru, buat akun baru lalu hapus yang lama.',
    submitText: 'Simpan perubahan',
    fields: [
      { name: 'name', label: 'Nama lengkap', required: true, maxlength: 60 },
      { name: 'role', label: 'Peran', type: 'select', half: true,
        options: [{ value: 'cashier', label: 'Kasir' }, { value: 'admin', label: 'Admin' }] },
      { name: 'tenant', label: 'Cabang', type: 'select', half: true, required: true,
        options: Lookups.tenantOptions({ includeAll: false }).length ? Lookups.tenantOptions({}) : opsiCabang }
    ],
    values: { name: baris.name, role: baris.role, tenant: baris.tenant_id },
    onSubmit: async (nilai) => {
      const hasil = await rest(`profiles?id=eq.${encodeURIComponent(baris.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: { name: nilai.name, role: nilai.role, tenant_id: nilai.tenant }
      });
      if (!hasil.ok) return { success: false, error: pesanError(hasil) };
      UI.toast('Akun diperbarui.', { type: 'success' });
      reloadPage();
      return { success: true };
    }
  });
}

export default {
  async render(params) {
    const filters = {
      client: params.get('client') || '',
      tenant: params.get('tenant') || '',
      cari: bersihkan(params.get('cari') || ''),
      offset: Math.max(0, Number(params.get('offset') || 0) || 0)
    };
    state.filters = filters;

    // Filter client diterjemahkan menjadi daftar cabang (bagian dari URL PostgREST).
    let tenantFilter = filters.tenant;
    if (!tenantFilter && filters.client) {
      const ids = Lookups.tenantsOf(filters.client).map((t) => t.id);
      tenantFilter = ids.length ? `in.(${ids.join(',')})` : 'in.()';
    }

    const jalur = 'profiles?select=id,username,name,role,avatar,tenant_id,created_at&order=created_at.desc' + q({
      tenant_id: tenantFilter,
      'or!': filters.cari ? `(username.ilike.*${filters.cari}*,name.ilike.*${filters.cari}*)` : ''
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
        { label: 'Akun', render: (r) => `<span class="cell-strong">@${UI.escape(r.username)}</span><span class="cell-sub">${UI.escape(r.name)}</span>` },
        { label: 'Peran', render: (r) => UI.badge(r.role === 'admin' ? 'Admin' : 'Kasir', r.role === 'admin' ? 'info' : '') },
        { label: 'Cabang', render: (r) => `${UI.escape(Lookups.tenant(r.tenant_id) ? Lookups.tenant(r.tenant_id).name : r.tenant_id)}<span class="cell-sub">${UI.escape(r.tenant_id)}</span>` },
        { label: 'Client', render: (r) => {
            const t = Lookups.tenant(r.tenant_id);
            return UI.escape(t ? Lookups.clientName(t.client_id) : '-');
          } },
        { label: 'Dibuat', render: (r) => UI.escape(formatDate(r.created_at)) },
        { label: '', align: 'num', render: (r) => UI.actions([
            UI.btnAksi('Ubah', { act: 'ubah', id: r.id }),
            UI.btnAksi('Hapus', { act: 'hapus', id: r.username })
          ]) }
      ],
      rows: hasil.data,
      empty: 'Belum ada akun yang cocok. Buat akun untuk client terlebih dulu.'
    });

    return `${barFilter(filters)}
      <div class="filters">
        <span class="hint">Total <strong>${UI.escape(String(hasil.total))}</strong> akun. Login POS memakai username tanpa spasi, cth <span class="mono">@c0001.budi</span>.</span>
      </div>
      ${UI.card({
        title: 'Akun client',
        hint: 'Akun dibuat langsung di Supabase Auth, lalu dipasangkan ke cabang.',
        body: tabel + UI.pager({ total: hasil.total, limit: LIMIT, offset: filters.offset })
      })}`;
  },

  init() {
    const form = document.getElementById('filterPengguna');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        Router.go(HALAMAN, {
          client: form.querySelector('#fpClient').value,
          tenant: form.querySelector('#fpCabang').value,
          cari: form.querySelector('#fpCari').value.trim()
        });
      });
      const pilihClient = form.querySelector('#fpClient');
      if (pilihClient) {
        pilihClient.addEventListener('change', () => {
          // Ganti client: cabang pada filter ikut menyesuaikan (mulai dari semua cabang client itu).
          Router.go(HALAMAN, { client: pilihClient.value, cari: form.querySelector('#fpCari').value.trim() });
        });
      }
    }
    UI.bindPager(document.getElementById('pager'), { total: state.total, limit: LIMIT, offset: state.filters.offset }, (offset) => {
      Router.go(HALAMAN, { client: state.filters.client, tenant: state.filters.tenant, cari: state.filters.cari, offset });
    });
  },

  async act(aksi, id) {
    if (aksi === 'tambah') { formTambah(state.filters); return; }
    if (aksi === 'bersihkan') { Router.go(HALAMAN); return; }

    if (aksi === 'ubah') {
      const baris = state.rows.find((r) => r.id === id);
      if (baris) formUbah(baris);
      return;
    }

    if (aksi === 'hapus') {
      const baris = state.rows.find((r) => r.username === id);
      const yakin = await UI.modal({
        title: 'Hapus akun',
        message: `Hapus akun @${id}? Akun tidak bisa login lagi dan username-nya bisa dipakai ulang. Riwayat transaksi lama tetap tersimpan.`,
        icon: 'danger', confirmText: 'Ya, Hapus', cancelText: 'Batal', variant: 'danger'
      });
      if (!yakin) return;
      const hasil = await rpc('platform_delete_user', { p_username: id });
      if (!hasil.ok) { UI.toast(pesanError(hasil), { type: 'danger', duration: 8000 }); return; }
      UI.toast(`Akun @${id} dihapus.`, { type: 'success' });
      if (baris) state.rows = state.rows.filter((r) => r.id !== baris.id);
      reloadPage();
    }
  }
};