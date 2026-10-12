import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../data/models/models.dart';
import '../../viewmodels/app_deps.dart';
import '../../viewmodels/transaksi_view_model.dart';
import '../widgets/common.dart';
import '../widgets/filter_bar.dart';
import '../widgets/vm_page.dart';

TransaksiFilters _draft(Map<String, String> d) =>
    TransaksiFilters(client: d['client'] ?? '', tenant: d['tenant'] ?? '', dari: d['dari'] ?? '', sampai: d['sampai'] ?? '', metode: d['metode'] ?? '', cari: d['cari'] ?? '');

class TransaksiPage extends StatelessWidget {
  const TransaksiPage({super.key, required this.params, required this.go});
  final Map<String, String> params;
  final Go go;

  @override
  Widget build(BuildContext context) => VmPage<TransaksiViewModel>(
        create: (deps) => TransaksiViewModel(deps, go, parseTransaksiFilters(params)),
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
                  const FilterFieldSpec(name: 'dari', label: 'Dari', kind: FilterKind.date),
                  const FilterFieldSpec(name: 'sampai', label: 'Sampai', kind: FilterKind.date),
                  const FilterFieldSpec(name: 'metode', label: 'Metode', kind: FilterKind.select, options: metodeOptions),
                  const FilterFieldSpec(name: 'cari', label: 'Cari no. / kasir', grow: true),
                ],
                onApply: (d) => vm.apply(_draft(d)),
                onClear: vm.clear,
              ),
              resourceBody(vm, (page) => SectionCard(
                    child: Column(children: [
                      AppDataTable<Sale>(
                        rows: page.rows,
                        empty: 'Tidak ada transaksi pada filter ini.',
                        columns: [
                          TableColumn('No.', (s) => Mono(s.no)),
                          TableColumn('Waktu', (s) => Text(formatDateTime(s.at))),
                          TableColumn('Cabang', (s) => CellStack(main: s.tenantName ?? s.tenantId, sub: lookups.clientName(s.tenantClientId))),
                          TableColumn('Kasir', (s) => Text(s.cashier)),
                          TableColumn('Metode', (s) => StatusBadge(s.method == 'tunai' ? 'Tunai' : 'Non-tunai', tone: s.method == 'tunai' ? Tone.ok : Tone.info)),
                          TableColumn('Total', (s) => Text(formatRupiah(s.total)), numeric: true),
                          TableColumn('Dibayar', (s) => Text(formatRupiah(s.paid)), numeric: true),
                        ],
                      ),
                      PagerBar(total: page.total, limit: transaksiLimit, offset: f.offset, onGo: vm.goPage),
                    ]),
                  )),
            ],
          );
        },
      );
}
