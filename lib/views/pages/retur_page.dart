import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../data/models/models.dart';
import '../../viewmodels/app_deps.dart';
import '../../viewmodels/retur_view_model.dart';
import '../widgets/common.dart';
import '../widgets/filter_bar.dart';
import '../widgets/vm_page.dart';

ReturPageFilters _draft(Map<String, String> d) => ReturPageFilters(
    client: d['client'] ?? '', tenant: d['tenant'] ?? '', dari: d['dari'] ?? '', sampai: d['sampai'] ?? '', jenis: d['jenis'] ?? '', alasan: d['alasan'] ?? '', cari: d['cari'] ?? '');

class ReturPage extends StatelessWidget {
  const ReturPage({super.key, required this.params, required this.go});
  final Map<String, String> params;
  final Go go;

  @override
  Widget build(BuildContext context) => VmPage<ReturViewModel>(
        create: (deps) => ReturViewModel(deps, go, parseReturFilters(params)),
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
                  const FilterFieldSpec(name: 'jenis', label: 'Jenis', kind: FilterKind.select, options: jenisOptions),
                  const FilterFieldSpec(name: 'alasan', label: 'Alasan', kind: FilterKind.select, options: alasanOptions),
                  const FilterFieldSpec(name: 'cari', label: 'Cari no. / barang', grow: true),
                ],
                onApply: (d) => vm.apply(_draft(d)),
                onClear: vm.clear,
              ),
              resourceBody(vm, (page) => SectionCard(
                    child: Column(children: [
                      AppDataTable<StockReturn>(
                        rows: page.rows,
                        empty: 'Tidak ada retur pada filter ini.',
                        columns: [
                          TableColumn('No.', (r) => Mono(r.no)),
                          TableColumn('Waktu', (r) => Text(formatDateTime(r.at))),
                          TableColumn('Cabang', (r) => CellStack(main: r.tenantName ?? r.tenantId, sub: lookups.clientName(r.tenantClientId))),
                          TableColumn('Jenis', (r) => StatusBadge(r.kind == 'pelanggan' ? 'Dari pelanggan' : 'Ke supplier', tone: r.kind == 'pelanggan' ? Tone.info : Tone.warn)),
                          TableColumn('Barang', (r) => CellStack(main: r.name, sub: r.itemId)),
                          TableColumn('Qty', (r) => Text('${formatNumber(r.qty)} ${r.unit}'), numeric: true),
                          TableColumn('Nilai', (r) => Text(formatRupiah(r.amount)), numeric: true),
                          TableColumn('Alasan', (r) => CellStack(main: labelAlasan[r.reason] ?? r.reason, sub: r.note)),
                          TableColumn('Kasir', (r) => Text(r.cashier)),
                        ],
                      ),
                      PagerBar(total: page.total, limit: returLimit, offset: f.offset, onGo: vm.goPage),
                    ]),
                  )),
            ],
          );
        },
      );
}
