import 'package:flutter/material.dart';

import '../../core/config.dart';
import '../../core/format.dart';
import '../../viewmodels/pengaturan_view_model.dart';
import '../widgets/common.dart';
import '../widgets/vm_page.dart';

class PengaturanPage extends StatefulWidget {
  const PengaturanPage({super.key});

  @override
  State<PengaturanPage> createState() => _PengaturanPageState();
}

class _PengaturanPageState extends State<PengaturanPage> {
  final _audit = TextEditingController(text: '$retensiAuditDefault');
  final _event = TextEditingController(text: '$retensiEventDefault');

  @override
  void dispose() {
    _audit.dispose();
    _event.dispose();
    super.dispose();
  }

  String _n(int? v) => v == null ? '-' : formatNumber(v);

  @override
  Widget build(BuildContext context) => VmPage<PengaturanViewModel>(
        create: PengaturanViewModel.new,
        builder: (context, vm, _) => PageBody(children: [
          SectionCard(
            title: 'Informasi sistem',
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Versi dashboard: ${AppConfig.appVersion}'),
              Text('Mode: ${AppConfig.demoMode ? 'demo (data contoh)' : 'terhubung ke Supabase'}'),
            ]),
          ),
          resourceBody(vm, (c) => StatGrid(children: [
                StatCard(label: 'Client', value: _n(c.klien)),
                StatCard(label: 'Cabang', value: _n(c.cabang)),
                StatCard(label: 'Akun client', value: _n(c.pengguna)),
                StatCard(label: 'Log audit', value: _n(c.logAudit)),
                StatCard(label: 'Log teknis', value: _n(c.logTeknis)),
              ])),
          SectionCard(
            title: 'Pangkas log lama',
            hint: 'Menghapus log audit dan log teknis yang sudah melewati masa simpan. Isi kosong/0 = nilai bawaan.',
            child: Wrap(spacing: 12, runSpacing: 12, crossAxisAlignment: WrapCrossAlignment.center, children: [
              SizedBox(width: 200, child: TextField(controller: _audit, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Simpan log audit (hari)'))),
              SizedBox(width: 200, child: TextField(controller: _event, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Simpan log teknis (hari)'))),
              FilledButton(onPressed: () => vm.pangkas(_audit.text, _event.text), child: const Text('Pangkas sekarang')),
            ]),
          ),
          SectionCard(
            title: 'Cache aplikasi',
            hint: 'Bila tampilan terasa usang setelah pembaruan, bersihkan cache lalu muat ulang.',
            child: Align(alignment: Alignment.centerLeft, child: OutlinedButton(onPressed: vm.bersihkanCache, child: const Text('Bersihkan cache'))),
          ),
        ]),
      );
}
