import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../data/models/models.dart';
import '../../viewmodels/app_deps.dart';
import '../../viewmodels/cabang_view_model.dart';
import '../widgets/common.dart';
import '../widgets/filter_bar.dart';
import '../widgets/vm_page.dart';

class CabangPage extends StatelessWidget {
  const CabangPage({super.key, required this.params, required this.go});
  final Map<String, String> params;
  final Go go;

  @override
  Widget build(BuildContext context) => VmPage<CabangViewModel>(
        create: (deps) => CabangViewModel(deps, go, parseCabangFilters(params)),
        builder: (context, vm, lookups) => PageBody(
          actions: [FilledButton(onPressed: vm.tambah, child: const Text('+ Tambah cabang'))],
          children: [
            FilterBarForm(
              initial: {'client': vm.filters.client, 'cari': vm.filters.cari},
              fields: [
                FilterFieldSpec(name: 'client', label: 'Client', kind: FilterKind.select, options: lookups.clientOptions(includeAll: true)),
                const FilterFieldSpec(name: 'cari', label: 'Cari nama cabang', placeholder: 'Nama atau ID', grow: true),
              ],
              onApply: (d) => vm.apply(d['client'] ?? '', d['cari'] ?? ''),
              onClear: vm.clear,
            ),
            resourceBody(vm, (data) => SectionCard(
                  child: Column(children: [
                    AppDataTable<Tenant>(
                      rows: data.page.rows,
                      empty: 'Tidak ada cabang yang cocok.',
                      columns: [
                        TableColumn('ID', (t) => Mono(t.id)),
                        TableColumn('Cabang', (t) => Text(t.name, style: const TextStyle(fontWeight: FontWeight.w700))),
                        TableColumn('Client', (t) => CellStack(main: lookups.clientName(t.clientId), sub: t.clientId)),
                        TableColumn('Pengguna', (t) => Text(formatNumber(data.pengguna[t.id] ?? 0)), numeric: true),
                        TableColumn('', (t) => RowActions([RowButton('Ubah', () => vm.ubah(t)), RowButton('Hapus', () => vm.hapus(t))])),
                      ],
                    ),
                    PagerBar(total: data.page.total, limit: cabangLimit, offset: vm.filters.offset, onGo: vm.goPage),
                  ]),
                )),
          ],
        ),
      );
}
