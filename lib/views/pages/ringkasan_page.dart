import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../data/models/models.dart';
import '../../viewmodels/app_deps.dart';
import '../../viewmodels/klien_view_model.dart' show statusTone;
import '../../viewmodels/log_audit_view_model.dart' show toneAksi, aksiOptions;
import '../../viewmodels/log_teknis_view_model.dart' show levelTone;
import '../../viewmodels/ringkasan_view_model.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/vm_page.dart';

class RingkasanPage extends StatelessWidget {
  const RingkasanPage({super.key, required this.go});
  final Go go;

  String _labelAksi(String aksi) {
    for (final o in aksiOptions) {
      if (o.value == aksi) return o.label;
    }
    return aksi;
  }

  @override
  Widget build(BuildContext context) => VmPage<RingkasanViewModel>(
        create: (deps) => RingkasanViewModel(deps, go),
        builder: (context, vm, _) => PageBody(children: [
          resourceBody(vm, (data) {
            final klien = data.klien;
            final aktif = klien.where((c) => c.status == 'aktif').length;
            final perhatian = klien.where(needsAttention).toList();
            return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              StatGrid(children: [
                StatCard(label: 'Client aktif', value: formatNumber(aktif), note: 'dari ${formatNumber(klien.length)} client'),
                StatCard(label: 'Cabang', value: formatNumber(sumOf(klien, (c) => c.branchCount))),
                StatCard(label: 'Pengguna', value: formatNumber(sumOf(klien, (c) => c.userCount))),
                StatCard(label: 'Transaksi 30 hari', value: formatNumber(sumOf(klien, (c) => c.trx30d))),
                StatCard(label: 'Omzet 30 hari', value: formatRupiah(sumOf(klien, (c) => c.omzet30d))),
                StatCard(label: 'Perlu perhatian', value: formatNumber(perhatian.length), tone: perhatian.isEmpty ? StatTone.success : StatTone.warning),
                StatCard(label: 'Error 7 hari', value: formatNumber(sumOf(klien, (c) => c.errors7d)), tone: sumOf(klien, (c) => c.errors7d) > 0 ? StatTone.danger : StatTone.none),
              ]),
              SectionCard(
                title: 'Perlu perhatian',
                hint: 'Langganan hampir/sudah berakhir, client tidak aktif, atau ada error terbaru.',
                child: AppDataTable<ClientOverview>(
                  rows: perhatian,
                  empty: 'Semua client dalam kondisi baik.',
                  columns: [
                    TableColumn('Client', (c) => CellStack(main: c.name, sub: c.id, strong: true)),
                    TableColumn('Status', (c) => StatusBadge(c.status, tone: statusTone(c.status))),
                    TableColumn('Langganan', (c) => StatusBadge(daysLabel(c.daysLeft), tone: subTone(c.subStatus, c.daysLeft))),
                    TableColumn('Alasan', (c) => DetailText(alasanPerhatian(c))),
                    TableColumn('', (c) => RowActions([RowButton('Langganan', () => go('/langganan', {'client': c.id})), RowButton('Log teknis', () => go('/log-teknis', {'client': c.id}))])),
                  ],
                ),
              ),
              LayoutBuilder(builder: (context, box) {
                final lebar = box.maxWidth >= 900;
                final audit = _aktivitas(data.aktivitas);
                final error = _errors(data.errors);
                return lebar ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: audit), const SizedBox(width: 16), Expanded(child: error)]) : Column(children: [audit, error]);
              }),
            ]);
          }),
        ]),
      );

  Widget _aktivitas(List<AuditLog>? rows) => SectionCard(
        title: 'Aktivitas terbaru',
        child: rows == null
            ? const Text('Log belum bisa dibaca.', style: TextStyle(color: AppColors.muted))
            : rows.isEmpty
                ? const Text('Belum ada aktivitas.', style: TextStyle(color: AppColors.muted))
                : Column(children: [
                    for (final r in rows)
                      ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: Row(children: [StatusBadge(_labelAksi(r.action), tone: toneAksi(r.action)), const SizedBox(width: 8), Flexible(child: Text(r.actorName ?? '-', overflow: TextOverflow.ellipsis))]),
                        subtitle: Text('${r.entity}${r.entityId == null ? '' : ' ${r.entityId}'}'),
                        trailing: Text(relTime(r.at), style: const TextStyle(fontSize: 12, color: AppColors.muted)),
                      ),
                  ]),
      );

  Widget _errors(List<ClientEvent>? rows) => SectionCard(
        title: 'Error terbaru dari perangkat',
        child: rows == null
            ? const Text('Log belum bisa dibaca.', style: TextStyle(color: AppColors.muted))
            : rows.isEmpty
                ? const Text('Tidak ada error terbaru.', style: TextStyle(color: AppColors.muted))
                : Column(children: [
                    for (final r in rows)
                      ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: Row(children: [StatusBadge(r.level, tone: levelTone(r.level)), const SizedBox(width: 8), Flexible(child: Text(r.source, overflow: TextOverflow.ellipsis))]),
                        subtitle: Text(r.message, maxLines: 2, overflow: TextOverflow.ellipsis),
                        trailing: Text(relTime(r.at), style: const TextStyle(fontSize: 12, color: AppColors.muted)),
                      ),
                  ]),
      );
}
