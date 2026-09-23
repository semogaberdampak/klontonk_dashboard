import { formatNumber } from './format.js';

// ============ KOMPONEN UI BERSAMA ============
// Dipakai seluruh halaman: notifikasi, modal, form-modal generik, tabel, dan paginasi.
// Catatan keamanan: SEMUA nilai dari database yang disisipkan ke HTML harus lewat
// UI.escape(). Nilai mentah hanya boleh dari kode sendiri (bukan dari input pengguna).

export const UI = {

  // Escape untuk disisipkan ke HTML (mencegah XSS dari data database).
  escape(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // Ikon SVG kecil (inline, tanpa berkas gambar).
  icon(name, size = 16) {
    const jalur = {
      info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>',
      warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
      danger: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
      success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
    };
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${jalur[name] || jalur.info}</svg>`;
  },

  // ---------- Notifikasi ----------
  toast(message, { type = 'info', duration = 3500 } = {}) {
    const root = document.getElementById('toastRoot');
    if (!root) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', 'status');
    const tanda = { info: 'i', success: 'v', warning: '!', danger: 'x' };
    el.innerHTML = `<span style="font-weight:700">${tanda[type] || 'i'}</span><span style="flex:1">${this.escape(message)}</span>`;
    root.appendChild(el);
    setTimeout(() => {
      el.classList.add('hiding');
      setTimeout(() => el.remove(), 250);
    }, duration);
  },

  // ---------- Modal konfirmasi / pemberitahuan ----------
  modal({ title = 'Pemberitahuan', message = '', icon = 'info', confirmText = 'OK', cancelText = null, variant = 'primary' } = {}) {
    return new Promise((resolve) => {
      const root = document.getElementById('modalRoot');
      root.innerHTML = '';

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      const dialog = document.createElement('div');
      dialog.className = 'modal-dialog';
      dialog.setAttribute('role', 'alertdialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.innerHTML = `
        <h2 class="modal-title">${this.escape(title)}</h2>
        <div class="modal-body">${this.escape(message)}</div>
        <div class="modal-actions">
          ${cancelText ? `<button type="button" class="btn btn-secondary" data-action="cancel">${this.escape(cancelText)}</button>` : ''}
          <button type="button" class="btn btn-${variant === 'danger' ? 'danger' : 'primary'}" data-action="confirm">${this.escape(confirmText)}</button>
        </div>`;

      root.appendChild(backdrop);
      root.appendChild(dialog);
      requestAnimationFrame(() => {
        root.classList.add('visible');
        root.setAttribute('aria-hidden', 'false');
        const tombol = dialog.querySelector('[data-action="confirm"]');
        if (tombol) tombol.focus();
      });

      const tutup = (nilai) => {
        root.classList.remove('visible');
        root.setAttribute('aria-hidden', 'true');
        setTimeout(() => { root.innerHTML = ''; }, 200);
        document.removeEventListener('keydown', onKey);
        resolve(nilai);
      };
      const onKey = (e) => { if (e.key === 'Escape') tutup(cancelText ? false : true); };
      document.addEventListener('keydown', onKey);

      const konfirmasi = dialog.querySelector('[data-action="confirm"]');
      if (konfirmasi) konfirmasi.addEventListener('click', () => tutup(true));
      const batal = dialog.querySelector('[data-action="cancel"]');
      if (batal) batal.addEventListener('click', () => tutup(false));
      backdrop.addEventListener('click', () => tutup(cancelText ? false : true));
    });
  },

  async confirmDelete(label) {
    return this.modal({
      title: 'Konfirmasi Hapus',
      message: `Yakin ingin menghapus ${label}? Tindakan ini tidak bisa dibatalkan.`,
      icon: 'danger',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      variant: 'danger'
    });
  },

  // ---------- Potongan tampilan ----------
  loading(text = 'Memuat data...') {
    return `<div class="loading"><span class="spinner"></span>${this.escape(text)}</div>`;
  },

  errorBox(message, { title = 'Gagal memuat data' } = {}) {
    return `<div class="card"><div class="card-head"><h2>${this.escape(title)}</h2></div>
      <p class="muted">${this.escape(message)}</p>
      <p class="hint">Periksa koneksi internet, lalu tekan "Muat ulang" di kanan atas.</p></div>`;
  },

  badge(text, tone = '') {
    return `<span class="badge"${tone ? ` data-tone="${tone}"` : ''}>${this.escape(text)}</span>`;
  },

  card({ title = '', hint = '', actions = '', body = '', id = '' }) {
    return `<section class="card"${id ? ` id="${id}"` : ''}>
      ${title ? `<div class="card-head"><div><h2>${this.escape(title)}</h2>${hint ? `<p class="hint">${this.escape(hint)}</p>` : ''}</div>${actions}</div>` : ''}
      ${body}</section>`;
  },

  stat({ label, value, note = '', tone = '' }) {
    return `<div class="stat"${tone ? ` data-tone="${tone}"` : ''}>
      <div class="stat-label">${this.escape(label)}</div>
      <div class="stat-value">${this.escape(value)}</div>
      ${note ? `<div class="stat-note">${this.escape(note)}</div>` : ''}
    </div>`;
  },  // ---------- Form-modal generik ----------
  // fields: [{ name, label, type, required, placeholder, hint, options, min, max, maxlength, rows, half }]
  // onSubmit(values) harus mengembalikan { success: true } atau { success: false, error }.
  // Modal hanya tertutup bila berhasil, sehingga pengguna bisa memperbaiki isian.
  formModal({ title, fields = [], values = {}, submitText = 'Simpan', cancelText = 'Batal', wide = false, note = '', onSubmit }) {
    return new Promise((resolve) => {
      const root = document.getElementById('modalRoot');
      root.innerHTML = '';

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      const dialog = document.createElement('div');
      dialog.className = 'modal-dialog' + (wide ? ' wide' : '');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      const kendali = (f) => {
        const nilai = values[f.name];
        const id = 'fm_' + f.name;
        const req = f.required ? ' required' : '';
        const ph = f.placeholder ? ` placeholder="${this.escape(f.placeholder)}"` : '';
        const batas = `${f.min !== undefined ? ` min="${f.min}"` : ''}${f.max !== undefined ? ` max="${f.max}"` : ''}${f.maxlength ? ` maxlength="${f.maxlength}"` : ''}`;

        if (f.type === 'checkbox') {
          return `<label style="display:flex;align-items:center;gap:8px;font-size:13px">
            <input type="checkbox" id="${id}" name="${this.escape(f.name)}"${nilai ? ' checked' : ''} />
            <span>${this.escape(f.label)}</span></label>${f.hint ? `<span class="hint">${this.escape(f.hint)}</span>` : ''}`;
        }
        if (f.type === 'select') {
          const opsi = (f.options || []).map((o) => {
            const terpilih = String(o.value) === String(nilai === undefined || nilai === null ? '' : nilai) ? ' selected' : '';
            return `<option value="${this.escape(o.value)}"${terpilih}>${this.escape(o.label)}</option>`;
          }).join('');
          return `<select id="${id}" name="${this.escape(f.name)}"${req}>${opsi}</select>`;
        }
        if (f.type === 'textarea') {
          return `<textarea id="${id}" name="${this.escape(f.name)}" rows="${f.rows || 3}"${req}${ph}${batas}>${this.escape(nilai || '')}</textarea>`;
        }
        const tipe = f.type || 'text';
        return `<input type="${tipe}" id="${id}" name="${this.escape(f.name)}" value="${this.escape(nilai === undefined || nilai === null ? '' : nilai)}"${req}${ph}${batas} />`;
      };

      const isiField = (f) => {
        const html = kendali(f);
        if (f.type === 'checkbox') return `<div class="field grow">${html}</div>`;
        return `<div class="field${f.half ? '' : ' grow'}">
          <label for="fm_${this.escape(f.name)}">${this.escape(f.label)}${f.required ? ' *' : ''}</label>
          ${html}${f.hint ? `<span class="hint">${this.escape(f.hint)}</span>` : ''}</div>`;
      };

      const baris = [];
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        if (f.half && fields[i + 1] && fields[i + 1].half) {
          baris.push(`<div class="form-row">${isiField(f)}${isiField(fields[i + 1])}</div>`);
          i++;
        } else {
          baris.push(isiField(f));
        }
      }

      dialog.innerHTML = `
        <h2 class="modal-title">${this.escape(title)}</h2>
        ${note ? `<p class="hint">${this.escape(note)}</p>` : ''}
        <form class="modal-form" id="modalForm" autocomplete="off" novalidate>${baris.join('')}</form>
        <div class="form-error" id="modalError" hidden></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-action="cancel">${this.escape(cancelText)}</button>
          <button type="button" class="btn btn-primary" id="modalSubmit">${this.escape(submitText)}</button>
        </div>`;

      root.appendChild(backdrop);
      root.appendChild(dialog);
      requestAnimationFrame(() => {
        root.classList.add('visible');
        root.setAttribute('aria-hidden', 'false');
        const pertama = dialog.querySelector('input, select, textarea');
        if (pertama) pertama.focus();
      });

      const errorEl = dialog.querySelector('#modalError');
      const submitBtn = dialog.querySelector('#modalSubmit');

      const kumpulkan = () => {
        const hasil = {};
        for (const f of fields) {
          const el = dialog.querySelector('#fm_' + f.name);
          if (!el) continue;
          if (f.type === 'checkbox') hasil[f.name] = el.checked;
          else hasil[f.name] = String(el.value || '').trim();
        }
        return hasil;
      };

      const tutup = (nilai) => {
        root.classList.remove('visible');
        root.setAttribute('aria-hidden', 'true');
        setTimeout(() => { root.innerHTML = ''; }, 200);
        document.removeEventListener('keydown', onKey);
        resolve(nilai);
      };
      const onKey = (e) => { if (e.key === 'Escape') tutup(false); };
      document.addEventListener('keydown', onKey);

      dialog.querySelector('[data-action="cancel"]').addEventListener('click', () => tutup(false));
      backdrop.addEventListener('click', () => tutup(false));

      const kirim = async () => {
        errorEl.hidden = true;
        const isian = kumpulkan();
        for (const f of fields) {
          if (f.required && !isian[f.name]) {
            errorEl.textContent = `${f.label} wajib diisi.`;
            errorEl.hidden = false;
            return;
          }
        }
        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy', 'true');
        try {
          const hasil = await onSubmit(isian);
          if (hasil && hasil.success) tutup(true);
          else {
            errorEl.textContent = (hasil && hasil.error) || 'Gagal menyimpan. Coba lagi.';
            errorEl.hidden = false;
          }
        } catch (e) {
          errorEl.textContent = 'Terjadi kesalahan. Coba lagi.';
          errorEl.hidden = false;
        } finally {
          submitBtn.disabled = false;
          submitBtn.removeAttribute('aria-busy');
        }
      };

      submitBtn.addEventListener('click', kirim);
      dialog.querySelector('#modalForm').addEventListener('submit', (e) => { e.preventDefault(); kirim(); });
    });
  },  // ---------- Tabel ----------
  // columns: [{ label, align, render(row, index), key }]. render() mengembalikan HTML --
  // nilai dari database WAJIB dibungkus UI.escape() di dalam render tersebut.
  table({ columns = [], rows = [], empty = 'Belum ada data.' }) {
    if (!rows.length) return `<div class="empty">${this.escape(empty)}</div>`;
    const head = columns.map((c) => `<th${c.align ? ` class="${c.align}"` : ''}>${this.escape(c.label)}</th>`).join('');
    const body = rows.map((row, i) => {
      const sel = columns.map((c) => {
        let isi;
        if (c.render) isi = c.render(row, i);
        else {
          const nilai = row[c.key];
          isi = this.escape(nilai === null || nilai === undefined ? '-' : nilai);
        }
        return `<td${c.align ? ` class="${c.align}"` : ''}>${(isi === null || isi === undefined || isi === '') ? '-' : isi}</td>`;
      }).join('');
      return `<tr>${sel}</tr>`;
    }).join('');
    return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  },

  // Baris tombol aksi di kolom kanan tabel.
  actions(tombol = []) {
    const isi = tombol.filter(Boolean).join('');
    return isi ? `<div class="row-actions">${isi}</div>` : '';
  },

  btnAksi(label, { act = '', id = '', tone = 'ghost', title = '' } = {}) {
    return `<button type="button" class="btn btn-${tone} btn-sm" data-act="${this.escape(act)}" data-id="${this.escape(id)}"${title ? ` title="${this.escape(title)}"` : ''}>${this.escape(label)}</button>`;
  },

  // ---------- Paginasi ----------
  pager({ total = 0, limit = 50, offset = 0, id = 'pager' }) {
    const dari = total === 0 ? 0 : offset + 1;
    const sampai = Math.min(offset + limit, total);
    const halaman = Math.floor(offset / limit) + 1;
    const totalHalaman = Math.max(1, Math.ceil(total / limit));
    return `<div class="pager" id="${id}">
      <span>Menampilkan <strong>${formatNumber(dari)}-${formatNumber(sampai)}</strong> dari <strong>${formatNumber(total)}</strong> baris</span>
      <span class="group">
        <button type="button" class="btn btn-secondary btn-sm" data-page="prev"${offset <= 0 ? ' disabled' : ''}>Sebelumnya</button>
        <span>Halaman ${halaman} / ${totalHalaman}</span>
        <button type="button" class="btn btn-secondary btn-sm" data-page="next"${sampai >= total ? ' disabled' : ''}>Berikutnya</button>
      </span>
    </div>`;
  },

  // Sambungkan tombol paginasi. onGo(offsetBaru) dipanggil saat halaman berpindah.
  bindPager(container, { total = 0, limit = 50, offset = 0 }, onGo) {
    if (!container) return;
    const prev = container.querySelector('[data-page="prev"]');
    const next = container.querySelector('[data-page="next"]');
    const pindah = (delta) => {
      const baru = offset + delta * limit;
      if (baru < 0 || baru >= total) return;
      onGo(baru);
    };
    if (prev) prev.addEventListener('click', () => pindah(-1));
    if (next) next.addEventListener('click', () => pindah(1));
  },

  async copy(text) {
    try {
      await navigator.clipboard.writeText(String(text));
      this.toast('Tersalin ke papan klip.', { type: 'success' });
    } catch (e) {
      this.toast('Gagal menyalin. Salin manual dari layar.', { type: 'warning' });
    }
  }
};

// Pembangun query PostgREST yang aman.
//   q({ select: 'id,name' })            -> select dibiarkan apa adanya (dibuat kode)
//   q({ 'no': 'ilike.*andi*' })         -> nilainya di-encode (aman dari & dan =)
//   q({ 'tenant_id!': 'in.(T001,T002)'}) -> tanda ! = nilai sudah aman, jangan di-encode
export function q(params = {}) {
  const bagian = [];
  for (const [kunci, nilai] of Object.entries(params)) {
    if (nilai === null || nilai === undefined || nilai === '') continue;
    const mentah = kunci.endsWith('!');
    const nama = mentah ? kunci.slice(0, -1) : kunci;
    bagian.push(nama + '=' + (mentah ? String(nilai) : encodeURIComponent(String(nilai))));
  }
  return bagian.length ? '?' + bagian.join('&') : '';
}