import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../data/models/models.dart';
import '../../viewmodels/app_deps.dart';
import '../../viewmodels/log_audit_view_model.dart';
import '../widgets/common.dart';
import '../widgets/filter_bar.dart';
import '../widgets/vm_page.dart';

AuditPageFilters _draft(Map<String, String> d) =>
    AuditPageFilters(client: d['client'] ?? '', tenant: d['tenant'] ?? '', aksi: d['aksi'] ?? '', pelaku: d['pelaku'] ?? '', dari: d['dari'] ?? '', sampai: d['sampai'] ?? '');

String _labelAksi(String aksi) {
  for (final o in aksiOptions) {
    if (o.value == aksi) return o.label;
  }
  return aksi;
}

class LogAuditPage extends StatelessWidget {
  const LogAuditPage({super.key, required this.params, required this.go});
  final Map<String, String> params;
  final Go go;

  @override
  Widget build(BuildContext context) => VmPage<LogAuditViewModel>(
        create: (deps) => LogAuditViewModel(deps, go, parseAuditFilters(params)),
        builder: (context, vm, lookups) {
          final f = vm.filters;
          return PageBody(
            actions: [OutlinedButton(onPressed: vm.exportCsv, child: const Text('Unduh CSV'))],
            children: [
              FilterBarForm(
                initial: f.toParams(),
                fields: [
                  FilterFieldSpec(name: 'client', label: 'Client', kind: FilterKind.select, options: lookups.clientOptions(includeAll: true), onChanged: (c, d) => vm.changeClient(c, _draft(d))),
                  FilterFieldSpec(name: 'tenant', label: 'Cabang', kind: FilterKind.select, options: lookups.tenantOptions(clientId: f.client, includeAll: true)),
                  const FilterFieldSpec(name: 'aksi', label: 'Aksi', kind: FilterKind.select, options: aksiOptions),
                  const FilterFieldSpec(name: 'pelaku', label: 'Pelaku'),
                  const FilterFieldSpec(name: 'dari', label: 'Dari', kind: FilterKind.date),
                  const FilterFieldSpec(name: 'sampai', label: 'Sampai', kind: FilterKind.date),
                ],
                onApply: (d) => vm.apply(_draft(d)),
                onClear: vm.clear,
              ),
              resourceBody(vm, (page) => SectionCard(
                    child: Column(children: [
                      AppDataTable<AuditLog>(
                        rows: page.rows,
                        empty: 'Tidak ada log pada filter ini.',
                        columns: [
                          TableColumn('Waktu', (r) => CellStack(main: formatDateTime(r.at), sub: relTime(r.at))),
                          TableColumn('Pelaku', (r) => CellStack(main: r.actorName ?? '-', sub: r.actorRole)),
                          TableColumn('Aksi', (r) => StatusBadge(_labelAksi(r.action), tone: toneAksi(r.action))),
                          TableColumn('Objek', (r) => CellStack(main: r.entity, sub: r.entityId)),
                          TableColumn('Client / cabang', (r) => CellStack(main: lookups.clientName(r.clientId), sub: r.tenantId)),
                          TableColumn('Rincian', (r) => DetailText(prettyDetail(r.detail))),
                          TableColumn('', (r) => RowActions([RowButton('Detail', () => vm.detail(r))])),
                        ],
                      ),
                      PagerBar(total: page.total, limit: auditLimit, offset: f.offset, onGo: vm.goPage),
                    ]),
                  )),
            ],
          );
        },
      );
}
