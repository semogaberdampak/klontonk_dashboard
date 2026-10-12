import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../data/models/models.dart';
import '../../viewmodels/app_deps.dart';
import '../../viewmodels/klien_view_model.dart';
import '../widgets/common.dart';
import '../widgets/filter_bar.dart';
import '../widgets/vm_page.dart';

class KlienPage extends StatelessWidget {
  const KlienPage({super.key, required this.params, required this.go});
  final Map<String, String> params;
  final Go go;

  @override
  Widget build(BuildContext context) => VmPage<KlienViewModel>(
        create: (deps) => KlienViewModel(deps, go, parseKlienFilters(params)),
        builder: (context, vm, _) => PageBody(
          actions: [FilledButton(onPressed: vm.tambah, child: const Text('+ Tambah client'))],
          children: [
            FilterBarForm(
              initial: {'cari': vm.filters.cari, 'status': vm.filters.status},
              fields: const [
                FilterFieldSpec(name: 'cari', label: 'Cari nama client', placeholder: 'Nama atau ID', grow: true),
                FilterFieldSpec(name: 'status', label: 'Status', kind: FilterKind.select, options: statusOptions),
              ],
              onApply: (d) => vm.apply(d['cari'] ?? '', d['status'] ?? ''),
              onClear: vm.clear,
            ),
            resourceBody(vm, (page) => SectionCard(
                  child: Column(children: [
                    AppDataTable<ClientOverview>(
                      rows: page.rows,
                      empty: 'Tidak ada client yang cocok.',
                      columns: [
                        TableColumn('Client', (c) => CellStack(main: c.name, sub: c.id, strong: true)),
                        TableColumn('Kontak', (c) => CellStack(main: c.contactName ?? '-', sub: c.contactPhone ?? c.contactEmail)),
                        TableColumn('Status', (c) => StatusBadge(c.status, tone: statusTone(c.status))),
                        TableColumn('Paket', (c) => CellStack(main: c.planName ?? '-', sub: c.subStatus == null ? null : '${c.subStatus} - ${daysLabel(c.daysLeft)}')),
                        TableColumn('Cabang', (c) => Text(formatNumber(c.branchCount)), numeric: true),
                        TableColumn('Pengguna', (c) => Text(formatNumber(c.userCount)), numeric: true),
                        TableColumn('Omzet 30 hari', (c) => Text(formatRupiah(c.omzet30d)), numeric: true),
                        TableColumn('', (c) => RowActions([
                              RowButton('Ubah', () => vm.ubah(c)),
                              if (c.status == 'aktif') RowButton('Suspend', () => vm.ubahStatus(c, 'suspend')) else RowButton('Aktifkan', () => vm.ubahStatus(c, 'aktif')),
                            ])),
                      ],
                    ),
                    PagerBar(total: page.total, limit: klienLimit, offset: vm.filters.offset, onGo: vm.goPage),
                  ]),
                )),
          ],
        ),
      );
}
