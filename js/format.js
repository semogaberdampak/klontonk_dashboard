// Pemformat angka, uang, dan waktu (zona Asia/Jakarta) untuk seluruh dashboard.

const TZ = 'Asia/Jakarta';
const fRupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const fAngka = new Intl.NumberFormat('id-ID');
const fTanggalJam = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' });
const fTanggal = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, dateStyle: 'medium' });

export const formatRupiah = (n) => fRupiah.format(Number(n) || 0);
export const formatNumber = (n) => fAngka.format(Number(n) || 0);

export function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : fTanggalJam.format(d);
}

export function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : fTanggal.format(d);
}

// Label sisa masa langganan dari jumlah hari (boleh negatif).
export function daysLabel(days) {
  if (days === null || days === undefined || days === '') return 'tanpa langganan';
  const n = Number(days);
  if (!Number.isFinite(n)) return '-';
  if (n === 0) return 'berakhir hari ini';
  if (n > 0) return `sisa ${n} hari`;
  return `lewat ${Math.abs(n)} hari`;
}

// Warna lencana untuk status langganan (dipakai tombol/status di tabel).
export function subTone(status, days) {
  const n = Number(days);
  if (status === 'berhenti') return 'bad';
  if (!Number.isFinite(n)) return 'bad';
  if (n < 0) return 'bad';
  if (status === 'jatuh_tempo' || n <= 14) return 'warn';
  if (status === 'trial') return 'info';
  return 'ok';
}

export function subLabel(status, days) {
  const nama = { trial: 'Trial', aktif: 'Aktif', jatuh_tempo: 'Jatuh tempo', berhenti: 'Berhenti' };
  return `${nama[status] || status || '-'} \u00b7 ${daysLabel(days)}`;
}

// "3 menit lalu" untuk kolom waktu pada log.
export function relTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const detik = Math.round((Date.now() - d.getTime()) / 1000);
  if (detik < 60) return 'baru saja';
  const menit = Math.round(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.round(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.round(jam / 24);
  if (hari < 30) return `${hari} hari lalu`;
  return formatDate(value);
}

const ringkasNilai = (v) => {
  if (v === null || v === undefined) return '(kosong)';
  if (typeof v === 'object') {
    const teks = JSON.stringify(v);
    return teks.length > 220 ? teks.slice(0, 217) + '...' : teks;
  }
  return String(v);
};

// Ubah isi kolom `detail` audit menjadi teks yang bisa dibaca manusia:
//   { qty: { dari: 10, jadi: 8 } }              -> "qty: 10 -> 8"
//   { sebelum: {...}, sesudah: {...} }          -> ringkasan JSON
//   { total: 25000, method: 'tunai' }           -> "total: 25000 | method: tunai"
export function prettyDetail(detail) {
  if (!detail || typeof detail !== 'object') return '';
  const bagian = [];
  for (const [kunci, nilai] of Object.entries(detail)) {
    if (nilai === null || nilai === undefined) continue;
    if (typeof nilai === 'object' && ('dari' in nilai || 'jadi' in nilai)) {
      bagian.push(`${kunci}: ${ringkasNilai(nilai.dari)} -> ${ringkasNilai(nilai.jadi)}`);
    } else {
      bagian.push(`${kunci}: ${ringkasNilai(nilai)}`);
    }
  }
  return bagian.join(' | ');
}

export function truncate(value, max = 60) {
  const teks = String(value === null || value === undefined ? '' : value);
  return teks.length > max ? teks.slice(0, max - 1) + '\u2026' : teks;
}

export function initialOf(name) {
  const teks = String(name || '').trim();
  return teks ? teks[0].toUpperCase() : '?';
}

// ---------- Ekspor CSV ----------
// Pemisah titik koma agar langsung rapi di Excel versi Indonesia.
export function toCsv(rows, columns) {
  const sel = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const head = columns.map((c) => sel(c.label)).join(';');
  const body = rows.map((row) => columns
    .map((c) => sel(typeof c.value === 'function' ? c.value(row) : row[c.key]))
    .join(';')).join('\n');
  return head + '\n' + body;
}

export function downloadCsv(filename, csv) {
  // BOM di depan agar Excel membaca UTF-8 dengan benar.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}