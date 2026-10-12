import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../data/models/models.dart';
import '../../viewmodels/app_deps.dart';
import '../../viewmodels/pemakaian_view_model.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/filter_bar.dart';
import '../widgets/vm_page.dart';

class PemakaianPage extends StatelessWidget {
  const PemakaianPage({super.key, required this.params, required this.go});
  final Map<String, String> params;
  final Go go;

  @override
  Widget build(BuildContext context) => VmPage<PemakaianViewModel>(
        create: (deps) => PemakaianViewModel(deps, go, parsePemakaianFilters(params)),
        builder: (context, vm, lookups) => PageBody(
          actions: [
            for (final hari in const [7, 30, 90]) OutlinedButton(onPressed: () => vm.lastDays(hari), child: Text('$hari hari')),
            OutlinedButton(onPressed: vm.exportCsv, child: const Text('Unduh CSV')),
          ],
          children: [
            FilterBarForm(
              initial: {'client': vm.filters.client, 'dari': vm.filters.dari, 'sampai': vm.filters.sampai},
              fields: [
                FilterFieldSpec(name: 'client', label: 'Client', kind: FilterKind.select, options: [const Option('', 'Pilih client'), ...lookups.clientOptions()]),
                const FilterFieldSpec(name: 'dari', label: 'Dari', kind: FilterKind.date),
                const FilterFieldSpec(name: 'sampai', label: 'Sampai', kind: FilterKind.date),
              ],
              onApply: (d) => vm.apply(d['client'] ?? '', d['dari'] ?? '', d['sampai'] ?? ''),
            ),
            if (vm.filters.client.isEmpty)
              const SectionCard(child: Text('Pilih client lalu tekan "Terapkan" untuk melihat aktivitas hariannya.', style: TextStyle(color: AppColors.muted)))
            else
              resourceBody(vm, (data) {
                final total = totalUsage(data.harian);
                return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  StatGrid(children: [
                    StatCard(label: 'Transaksi', value: formatNumber(total.trx)),
                    StatCard(label: 'Omzet', value: formatRupiah(total.omzet)),
                    StatCard(label: 'Retur', value: formatNumber(total.retur), note: formatRupiah(total.nilaiRetur)),
                    StatCard(label: 'Log audit', value: formatNumber(total.log)),
                    StatCard(label: 'Error', value: formatNumber(total.error), tone: total.error > 0 ? StatTone.danger : StatTone.none),
                  ]),
                  SectionCard(
                    title: data.klien?.name ?? vm.filters.client,
                    hint: '${formatDate(vm.filters.dari)} - ${formatDate(vm.filters.sampai)}',
                    child: AppDataTable<UsageDay>(
                      rows: data.harian,
                      empty: 'Tidak ada aktivitas pada rentang ini.',
                      columns: [
                        TableColumn('Tanggal', (r) => Text(formatDate(r.day))),
                        TableColumn('Transaksi', (r) => Text(formatNumber(r.trxCount)), numeric: true),
                        TableColumn('Omzet', (r) => Text(formatRupiah(r.trxTotal)), numeric: true),
                        TableColumn('Retur', (r) => Text(formatNumber(r.returnCount)), numeric: true),
                        TableColumn('Nilai retur', (r) => Text(formatRupiah(r.returnAmount)), numeric: true),
                        TableColumn('Log', (r) => Text(formatNumber(r.logCount)), numeric: true),
                        TableColumn('Error', (r) => Text(formatNumber(r.eventCount)), numeric: true),
                      ],
                    ),
                  ),
                ]);
              }),
          ],
        ),
      );
}
