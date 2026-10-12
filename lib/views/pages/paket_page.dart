import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../data/models/models.dart';
import '../../viewmodels/paket_view_model.dart';
import '../widgets/common.dart';
import '../widgets/vm_page.dart';

class PaketPage extends StatelessWidget {
  const PaketPage({super.key});

  @override
  Widget build(BuildContext context) => VmPage<PaketViewModel>(
        create: PaketViewModel.new,
        builder: (context, vm, _) => PageBody(
          actions: [FilledButton(onPressed: vm.tambah, child: const Text('+ Tambah paket'))],
          children: [
            resourceBody(vm, (data) => SectionCard(
                  child: AppDataTable<Plan>(
                    rows: data.paket,
                    empty: 'Belum ada paket.',
                    columns: [
                      TableColumn('Paket', (p) => CellStack(main: p.name, sub: p.code, strong: true)),
                      TableColumn('Harga / bulan', (p) => Text(formatRupiah(p.priceMonth)), numeric: true),
                      TableColumn('Maks. cabang', (p) => Text(formatNumber(p.maxBranches)), numeric: true),
                      TableColumn('Maks. pengguna', (p) => Text(formatNumber(p.maxUsers)), numeric: true),
                      TableColumn('Dipakai', (p) => Text('${formatNumber(data.dipakai[p.code] ?? 0)} client'), numeric: true),
                      TableColumn('Status', (p) => StatusBadge(p.isActive ? 'Aktif' : 'Nonaktif', tone: p.isActive ? Tone.ok : Tone.none)),
                      TableColumn('Catatan', (p) => DetailText(p.note ?? '-')),
                      TableColumn('', (p) => RowActions([
                            RowButton('Ubah', () => vm.ubah(p)),
                            RowButton(p.isActive ? 'Nonaktifkan' : 'Aktifkan', () => vm.toggle(p)),
                            RowButton('Hapus', () => vm.hapus(p)),
                          ])),
                    ],
                  ),
                )),
          ],
        ),
      );
}
