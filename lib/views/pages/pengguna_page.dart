import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../data/models/models.dart';
import '../../viewmodels/app_deps.dart';
import '../../viewmodels/pengguna_view_model.dart';
import '../widgets/common.dart';
import '../widgets/filter_bar.dart';
import '../widgets/vm_page.dart';

class PenggunaPage extends StatelessWidget {
  const PenggunaPage({super.key, required this.params, required this.go});
  final Map<String, String> params;
  final Go go;

  @override
  Widget build(BuildContext context) => VmPage<PenggunaViewModel>(
        create: (deps) => PenggunaViewModel(deps, go, parsePenggunaFilters(params)),
        builder: (context, vm, lookups) => PageBody(
          actions: [FilledButton(onPressed: vm.tambah, child: const Text('+ Tambah akun'))],
          children: [
            FilterBarForm(
              initial: {'client': vm.filters.client, 'tenant': vm.filters.tenant, 'cari': vm.filters.cari},
              fields: [
                FilterFieldSpec(
                  name: 'client',
                  label: 'Client',
                  kind: FilterKind.select,
                  options: lookups.clientOptions(includeAll: true),
                  onChanged: (client, draft) => vm.changeClient(client, draft['cari'] ?? ''),
                ),
                FilterFieldSpec(name: 'tenant', label: 'Cabang', kind: FilterKind.select, options: lookups.tenantOptions(clientId: vm.filters.client, includeAll: true)),
                const FilterFieldSpec(name: 'cari', label: 'Cari username / nama', grow: true),
              ],
              onApply: (d) => vm.apply(d['client'] ?? '', d['tenant'] ?? '', d['cari'] ?? ''),
              onClear: vm.clear,
            ),
            resourceBody(vm, (page) => SectionCard(
                  child: Column(children: [
                    AppDataTable<Profile>(
                      rows: page.rows,
                      empty: 'Tidak ada akun yang cocok.',
                      columns: [
                        TableColumn('Username', (p) => CellStack(main: p.username, sub: p.name, strong: true)),
                        TableColumn('Peran', (p) => StatusBadge(p.role == 'admin' ? 'Admin' : 'Kasir', tone: p.role == 'admin' ? Tone.info : Tone.none)),
                        TableColumn('Cabang', (p) {
                          final t = lookups.tenant(p.tenantId);
                          return CellStack(main: t?.name ?? p.tenantId, sub: t == null ? null : lookups.clientName(t.clientId));
                        }),
                        TableColumn('Dibuat', (p) => Text(formatDate(p.createdAt))),
                        TableColumn('', (p) => RowActions([RowButton('Ubah', () => vm.ubah(p)), RowButton('Hapus', () => vm.hapus(p))])),
                      ],
                    ),
                    PagerBar(total: page.total, limit: penggunaLimit, offset: vm.filters.offset, onGo: vm.goPage),
                  ]),
                )),
          ],
        ),
      );
}
