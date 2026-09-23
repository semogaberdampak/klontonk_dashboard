import { rest } from '../supabase.js';
import { UI } from '../ui.js';
import { Auth } from '../auth.js';
import { Router } from '../router.js';
import { formatNumber, formatRupiah, formatDateTime, relTime, daysLabel, subTone, prettyDetail } from '../format.js';

// ============ RINGKASAN ============
// Satu layar untuk melihat kondisi seluruh client: langganan yang mendekati akhir,
// error terbaru dari perangkat client, dan aktivitas terakhir.
// Angka agregat dihitung di database (view v_client_overview), bukan di browser.

const AMBANG_HARI = 14;   // langganan dianggap "segera berakhir" bila <= 14 hari

function alasanPerhatian(c) {
  const bagian = [];
  if (c.status === 'suspend') bagian.push('client disuspend');
  if (c.status === 'berhenti') bagian.push('client berhenti');
  if (c.sub_status === 'berhenti') bagian.push('langganan berhenti');
  if (c.days_left === null || c.days_left === undefined) bagian.push('belum ada langganan');
  else if (Number(c.days_left) < 0) bagian.push('langganan sudah berakhir');
  else if (Number(c.days_left) <= AMBANG_HARI) bagian.push('langganan segera berakhir');
  if (Number(c.errors_7d || 0) > 0) bagian.push(`${formatNumber(c.errors_7d)} error dalam 7 hari`);
  return bagian.join(', ') || '-';
}

export default {
  async render() {
    const [overview, log, errors] = await Promise.all([
      rest('v_client_overview?select=*&order=name'),
      rest('audit_logs?select=at,actor_name,actor_role,action,entity,entity_id,tenant_id,client_id,detail&order=at.desc&limit=8'),
      rest('client_events?select=at,level,source,message,tenant_id,client_id,app_version&level=eq.error&order=at.desc&limit=5')
    ]);

    if (!overview.ok) {
      if (overview.expired) { Auth.expired(); return UI.loading('Sesi berakhir. Mengarahkan ke halaman login...'); }
      return UI.errorBox(overview.message);
    }

    const klien = overview.data || [];
    if (!klien.length) {
      return UI.card({
        title: 'Belum ada client',
        hint: 'Tambahkan client pertama untuk mulai memantau.',
        body: `<p class="muted">Satu client mewakili satu pelanggan berlangganan, dan boleh memiliki beberapa cabang.</p>
               <button type="button" class="btn btn-primary" data-act="ke-klien">Tambah client</button>`
      });
    }

    const jumlah = (kunci) => klien.reduce((total, c) => total + Number(c[kunci] || 0), 0);
    const perluPerhatian = klien.filter((c) => c.status !== 'aktif'
      || c.sub_status === 'berhenti'
      || c.days_left === null || c.days_left === undefined
      || Number(c.days_left) <= AMBANG_HARI
      || Number(c.errors_7d || 0) > 0);

    const statistik = `<div class="stat-grid">
      ${UI.stat({ label: 'Client', value: formatNumber(klien.length), note: `${formatNumber(klien.filter((c) => c.status === 'aktif').length)} aktif` })}
      ${UI.stat({ label: 'Cabang', value: formatNumber(jumlah('branch_count')) })}
      ${UI.stat({ label: 'Pengguna', value: formatNumber(jumlah('user_count')) })}
      ${UI.stat({ label: 'Transaksi 30 hari', value: formatNumber(jumlah('trx_30d')) })}
      ${UI.stat({ label: 'Omzet 30 hari', value: formatRupiah(jumlah('omzet_30d')) })}
      ${UI.stat({ label: 'Perlu perhatian', value: formatNumber(perluPerhatian.length), tone: perluPerhatian.length ? 'warning' : 'success' })}
      ${UI.stat({ label: 'Error 7 hari', value: formatNumber(jumlah('errors_7d')), tone: jumlah('errors_7d') ? 'danger' : 'success' })}
    </div>`;

    const tabelPerhatian = UI.table({
      columns: [
        { label: 'Client', render: (r) => `<span class="cell-strong">${UI.escape(r.name)}</span><span class="cell-sub">${UI.escape(r.id)}</span>` },
        { label: 'Alasan', render: (r) => UI.escape(alasanPerhatian(r)) },
        { label: 'Langganan', render: (r) => UI.badge(daysLabel(r.days_left), subTone(r.sub_status, r.days_left)) },
        { label: 'Batch', align: 'num', render: (r) => UI.actions([
          UI.btnAksi('Pemakaian', { act: 'pemakaian', id: r.id }),
          UI.btnAksi('Langganan', { act: 'langganan', id: r.id })
        ]) }
      ],
      rows: perluPerhatian,
      empty: 'Semua client sehat -- tidak ada yang perlu perhatian.'
    });

    const tabelKlien = UI.table({
      columns: [
        { label: 'Client', render: (r) => `<span class="cell-strong">${UI.escape(r.name)}</span><span class="cell-sub">${UI.escape(r.id)}</span>` },
        { label: 'Paket', render: (r) => r.plan_name ? `${UI.escape(r.plan_name)}<span class="cell-sub">${UI.escape(r.plan_code)}</span>` : '-' },
        { label: 'Cabang', align: 'num', key: 'branch_count' },
        { label: 'Pengguna', align: 'num', key: 'user_count' },
        { label: 'Sisa langganan', render: (r) => UI.badge(daysLabel(r.days_left), subTone(r.sub_status, r.days_left)) },
        { label: 'Trx 30 hari', align: 'num', render: (r) => formatNumber(r.trx_30d) },
        { label: 'Omzet 30 hari', align: 'num', render: (r) => formatRupiah(r.omzet_30d) },
        { label: 'Error 7 hari', align: 'num', render: (r) => (Number(r.errors_7d || 0) > 0 ? UI.badge(formatNumber(r.errors_7d), 'bad') : '0') },
        { label: '', align: 'num', render: (r) => UI.actions([UI.btnAksi('Log', { act: 'log-audit', id: r.id })]) }
      ],
      rows: klien
    });

    const tabelAktivitas = UI.table({
      columns: [
        { label: 'Waktu', render: (r) => `${UI.escape(relTime(r.at))}<span class="cell-sub">${UI.escape(formatDateTime(r.at))}</span>` },
        { label: 'Pelaku', render: (r) => `${UI.escape(r.actor_name || '-')}<span class="cell-sub">${UI.escape(r.actor_role || '')}</span>` },
        { label: 'Aksi', render: (r) => UI.badge(r.action, 'info') },
        { label: 'Objek', render: (r) => `${UI.escape(r.entity)}${r.entity_id ? `<span class="cell-sub">${UI.escape(r.entity_id)}</span>` : ''}` },
        { label: 'Rincian', render: (r) => `<span class="detail-cell">${UI.escape(prettyDetail(r.detail))}</span>` }
      ],
      rows: log.ok ? log.data : [],
      empty: log.ok ? 'Belum ada aktivitas tercatat.' : 'Log audit belum bisa dibaca.'
    });

    const tabelError = UI.table({
      columns: [
        { label: 'Waktu', render: (r) => UI.escape(relTime(r.at)) },
        { label: 'Sumber', render: (r) => UI.badge(r.source, 'warn') },
        { label: 'Pesan', render: (r) => `<span class="detail-cell">${UI.escape(r.message)}</span>` },
        { label: 'Versi', render: (r) => UI.escape(r.app_version || '-') }
      ],
      rows: errors.ok ? errors.data : [],
      empty: errors.ok ? 'Tidak ada error dari client. Bagus.' : 'Log teknis belum bisa dibaca.'
    });

    return `${statistik}
      ${UI.card({ title: 'Perlu perhatian', hint: 'Client yang bermasalah atau langganannya mendekati akhir.', body: tabelPerhatian })}
      ${UI.card({ title: 'Semua client', body: tabelKlien })}
      <div class="grid-2">
        ${UI.card({ title: 'Aktivitas terbaru', hint: 'Dicatat otomatis oleh database.', body: tabelAktivitas })}
        ${UI.card({ title: 'Error terbaru dari client', body: tabelError })}
      </div>`;
  },

  act(aksi, id) {
    if (aksi === 'ke-klien') Router.go('/klien');
    else if (aksi === 'pemakaian') Router.go('/pemakaian', { client: id });
    else if (aksi === 'langganan') Router.go('/langganan', { client: id });
    else if (aksi === 'log-audit') Router.go('/log-audit', { client: id });
  }
};