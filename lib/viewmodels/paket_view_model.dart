import '../core/format.dart';
import '../core/result.dart';
import '../data/models/models.dart';
import '../data/repositories/plan_repository.dart';
import '../services/form_types.dart';
import '../services/services.dart';
import 'resource_view_model.dart';

/// Batas jumlah cabang/pengguna pada paket DITEGAKKAN oleh trigger database (check_plan_limit),
/// bukan hanya di tampilan ini.
final _kodePola = RegExp(r'^[a-z0-9_]{2,20}$');

class PaketData {
  const PaketData({required this.paket, required this.dipakai});
  final List<Plan> paket;

  /// kode paket -> jumlah client yang memakainya
  final Map<String, int> dipakai;
}

List<FormFieldSpec> _kolomForm({required bool termasukKode}) => [
      if (termasukKode)
        const FormFieldSpec(name: 'code', label: 'Kode paket', required: true, half: true, maxLength: 20, placeholder: 'cth: umkm_basic', hint: 'Huruf kecil/angka/underscore. Tidak bisa diubah setelah dibuat.'),
      const FormFieldSpec(name: 'name', label: 'Nama paket', required: true, half: true, maxLength: 40, placeholder: 'cth: UMKM Basic'),
      const FormFieldSpec(name: 'price_month', label: 'Harga per bulan (Rp)', type: FieldType.number, half: true),
      const FormFieldSpec(name: 'max_branches', label: 'Maksimal cabang', type: FieldType.number, half: true),
      const FormFieldSpec(name: 'max_users', label: 'Maksimal pengguna', type: FieldType.number, half: true),
      const FormFieldSpec(name: 'is_active', label: 'Paket aktif (boleh dipilih saat membuat client baru)', type: FieldType.checkbox),
      const FormFieldSpec(name: 'note', label: 'Catatan', type: FieldType.textarea, maxLength: 200),
    ];

PlanInput toPlanInput(FormValues v) => PlanInput(
      name: (v['name'] ?? '').toString(),
      priceMonth: toNum(v['price_month']),
      maxBranches: toNum(v['max_branches']).toInt() <= 0 ? 1 : toNum(v['max_branches']).toInt(),
      maxUsers: toNum(v['max_users']).toInt() <= 0 ? 1 : toNum(v['max_users']).toInt(),
      isActive: v['is_active'] == true,
      note: (v['note'] ?? '').toString().isEmpty ? null : v['note'].toString(),
    );

class PaketViewModel extends ResourceViewModel<PaketData> {
  PaketViewModel(super.deps);

  @override
  Future<Result<PaketData>> fetch() async {
    final hasil = await Future.wait([deps.plans.list(), deps.overview.planUsage()]);
    final paket = hasil[0] as Result<List<Plan>>;
    if (paket case Err(:final error)) return Err(error);
    final ringkas = hasil[1] as Result<List<ClientOverview>>;
    final dipakai = <String, int>{};
    if (ringkas case Ok(:final data)) {
      for (final c in data) {
        final kode = c.planCode;
        if (kode != null) dipakai[kode] = (dipakai[kode] ?? 0) + 1;
      }
    }
    return Ok(PaketData(paket: (paket as Ok<List<Plan>>).data, dipakai: dipakai));
  }

  Future<void> _afterSave(String message) async {
    deps.toast.show(message, type: ToastType.success);
    await deps.lookups.refresh();
    deps.reload.reload();
  }

  Future<SubmitResult> _save(Future<Result<void>> operation, String message) async {
    final hasil = await operation;
    if (hasil case Err(:final error)) return SubmitFail(pesanError(error));
    await _afterSave(message);
    return const SubmitOk();
  }

  Future<void> tambah() => deps.dialog.form(FormSpec(
        title: 'Tambah paket',
        submitText: 'Simpan paket',
        wide: true,
        fields: _kolomForm(termasukKode: true),
        values: const {'price_month': 100000, 'max_branches': 1, 'max_users': 3, 'is_active': true},
        onSubmit: (v) async {
          final kode = (v['code'] ?? '').toString().trim().toLowerCase();
          if (!_kodePola.hasMatch(kode)) return const SubmitFail('Kode paket 2-20 karakter: huruf kecil, angka, underscore.');
          return _save(deps.plans.create(kode, toPlanInput(v)), 'Paket dibuat.');
        },
      ));

  Future<void> ubah(Plan paket) => deps.dialog.form(FormSpec(
        title: 'Ubah paket ${paket.code}',
        submitText: 'Simpan perubahan',
        wide: true,
        fields: _kolomForm(termasukKode: false),
        values: {
          'name': paket.name,
          'price_month': paket.priceMonth,
          'max_branches': paket.maxBranches,
          'max_users': paket.maxUsers,
          'is_active': paket.isActive,
          'note': paket.note ?? '',
        },
        onSubmit: (v) => _save(deps.plans.update(paket.code, toPlanInput(v)), 'Paket diperbarui.'),
      ));

  Future<void> toggle(Plan paket) async {
    final hasil = await deps.plans.setActive(paket.code, !paket.isActive);
    if (hasil case Err(:final error)) return deps.toast.show(pesanError(error), type: ToastType.danger);
    await _afterSave(paket.isActive ? 'Paket dinonaktifkan.' : 'Paket diaktifkan.');
  }

  Future<void> hapus(Plan paket) async {
    final yakin = await deps.dialog.confirmDelete('Hapus paket', 'Hapus paket "${paket.name}" (${paket.code})? Paket yang masih dipakai langganan akan ditolak oleh database.');
    if (!yakin) return;
    final hasil = await deps.plans.delete(paket.code);
    if (hasil case Err(:final error)) {
      final pesan = isReferenceConflict(error) ? 'Paket tidak bisa dihapus karena masih dipakai oleh catatan langganan. Nonaktifkan saja.' : pesanError(error);
      return deps.toast.show(pesan, type: ToastType.danger, duration: const Duration(seconds: 8));
    }
    await _afterSave('Paket dihapus.');
  }
}
