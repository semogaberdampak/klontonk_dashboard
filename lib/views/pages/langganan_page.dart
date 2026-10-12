import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../data/models/models.dart';
import '../../viewmodels/app_deps.dart';
import '../../viewmodels/klien_view_model.dart' show statusTone;
import '../../viewmodels/langganan_view_model.dart';
import '../widgets/common.dart';
import '../widgets/filter_bar.dart';
import '../widgets/vm_page.dart';

class LanggananPage extends StatelessWidget {
  const LanggananPage({super.key, required this.params, required this.go});
  final Map<String, String> params;
  final Go go;

  @override
  Widget build(BuildContext context) => VmPage<LanggananViewModel>(
        create: (deps) => LanggananViewModel(deps, go, parseLanggananFilters(params)),
        builder: (context, vm, lookups) => PageBody(
          actions: [
            FilledButton(onPressed: vm.tambah, child: const Text('+ Catat langganan')),
            OutlinedButton(onPressed: vm.sinkron, child: const Text('Sinkronkan status')),
          ],
          children: [
            resourceBody(vm, (data) {
              final ringkas = summarize(data.ringkas);
              return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                StatGrid(children: [
                  StatCard(label: 'Berlaku', value: formatNumber(ringkas.berlaku.length), note: '${formatNumber(ringkas.trial.length)} masih trial'),
                  StatCard(label: 'Perlu perhatian', value: formatNumber(ringkas.perhatian.length), tone: ringkas.perhatian.isEmpty ? StatTone.success : StatTone.warning),
                  StatCard(label: 'Potensi / bulan', value: formatRupiah(ringkas.potensi), note: 'dari paket yang berlaku'),
                ]),
                FilterBarForm(
                  initial: {'client': vm.filters.client, 'status': vm.filters.status},
                  fields: [
                    FilterFieldSpec(name: 'client', label: 'Client', kind: FilterKind.select, options: lookups.clientOptions(includeAll: true)),
                    const FilterFieldSpec(name: 'status', label: 'Status', kind: FilterKind.select, options: statusFilterOptions),
                  ],
                  onApply: (d) => vm.apply(d['client'] ?? '', d['status'] ?? ''),
                  onClear: vm.clear,
                ),
                SectionCard(
                  child: Column(children: [
                    AppDataTable<Subscription>(
                      rows: data.riwayat.rows,
                      empty: 'Belum ada catatan langganan.',
                      columns: [
                        TableColumn('Client', (s) => CellStack(main: s.clientName ?? lookups.clientName(s.clientId), sub: s.clientId, strong: true)),
                        TableColumn('Paket', (s) => Text(s.planName ?? s.planCode)),
                        TableColumn('Mulai', (s) => Text(formatDate(s.startedAt))),
                        TableColumn('Berakhir', (s) => Text(formatDate(s.expiresAt))),
                        TableColumn('Status', (s) => StatusBadge(s.status, tone: s.status == 'berhenti' ? Tone.bad : (s.status == 'jatuh_tempo' ? Tone.warn : (s.status == 'trial' ? Tone.info : statusTone('aktif'))))),
                        TableColumn('Catatan', (s) => DetailText(s.note ?? '-')),
                        TableColumn('', (s) => RowActions([RowButton('Ubah', () => vm.ubah(s)), RowButton('+30 hari', () => vm.perpanjang(s)), RowButton('Hapus', () => vm.hapus(s))])),
                      ],
                    ),
                    PagerBar(total: data.riwayat.total, limit: langgananLimit, offset: vm.filters.offset, onGo: vm.goPage),
                  ]),
                ),
              ]);
            }),
          ],
        ),
      );
}
