import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../data/models/models.dart';
import '../../viewmodels/app_deps.dart';
import '../../viewmodels/log_teknis_view_model.dart';
import '../widgets/common.dart';
import '../widgets/filter_bar.dart';
import '../widgets/vm_page.dart';

TeknisPageFilters _draft(Map<String, String> d) =>
    TeknisPageFilters(level: d['level'] ?? '', client: d['client'] ?? '', tenant: d['tenant'] ?? '', cari: d['cari'] ?? '', dari: d['dari'] ?? '', sampai: d['sampai'] ?? '');

class LogTeknisPage extends StatelessWidget {
  const LogTeknisPage({super.key, required this.params, required this.go});
  final Map<String, String> params;
  final Go go;

  @override
  Widget build(BuildContext context) => VmPage<LogTeknisViewModel>(
        create: (deps) => LogTeknisViewModel(deps, go, parseTeknisFilters(params)),
        builder: (context, vm, lookups) {
          final f = vm.filters;
          return PageBody(
            actions: [OutlinedButton(onPressed: vm.exportCsv, child: const Text('Unduh CSV'))],
            children: [
              FilterBarForm(
                initial: f.toParams(),
                fields: [
                  const FilterFieldSpec(name: 'level', label: 'Level', kind: FilterKind.select, options: levelOptions),
                  FilterFieldSpec(name: 'client', label: 'Client', kind: FilterKind.select, options: lookups.clientOptions(includeAll: true), onChanged: (c, d) => vm.changeClient(c, _draft(d))),
                  FilterFieldSpec(name: 'tenant', label: 'Cabang', kind: FilterKind.select, options: lookups.tenantOptions(clientId: f.client, includeAll: true)),
                  const FilterFieldSpec(name: 'dari', label: 'Dari', kind: FilterKind.date),
                  const FilterFieldSpec(name: 'sampai', label: 'Sampai', kind: FilterKind.date),
                  const FilterFieldSpec(name: 'cari', label: 'Cari pesan / sumber', grow: true),
                ],
                onApply: (d) => vm.apply(_draft(d)),
                onClear: vm.clear,
              ),
              resourceBody(vm, (data) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    StatGrid(children: [
                      StatCard(label: 'Error', value: formatNumber(data.error), tone: data.error > 0 ? StatTone.danger : StatTone.none),
                      StatCard(label: 'Peringatan', value: formatNumber(data.warn), tone: data.warn > 0 ? StatTone.warning : StatTone.none),
                      StatCard(label: 'Info', value: formatNumber(data.info)),
                    ]),
                    SectionCard(
                      child: Column(children: [
                        AppDataTable<ClientEvent>(
                          rows: data.page.rows,
                          empty: 'Tidak ada log teknis pada filter ini.',
                          columns: [
                            TableColumn('Waktu', (r) => CellStack(main: formatDateTime(r.at), sub: relTime(r.at))),
                            TableColumn('Level', (r) => StatusBadge(r.level, tone: levelTone(r.level))),
                            TableColumn('Sumber', (r) => Text(r.source)),
                            TableColumn('Pesan', (r) => DetailText(r.message)),
                            TableColumn('Client / cabang', (r) => CellStack(main: lookups.clientName(r.clientId), sub: r.tenantId)),
                            TableColumn('Versi', (r) => Text(r.appVersion ?? '-')),
                            TableColumn('', (r) => RowActions([RowButton('Detail', () => vm.detail(r))])),
                          ],
                        ),
                        PagerBar(total: data.page.total, limit: teknisLimit, offset: f.offset, onGo: vm.goPage),
                      ]),
                    ),
                  ])),
            ],
          );
        },
      );
}
