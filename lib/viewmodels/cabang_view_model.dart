import '../core/query.dart';
import '../core/result.dart';
import '../data/models/models.dart';
import '../data/repositories/tenant_repository.dart';
import '../services/form_types.dart';
import '../services/services.dart';
import 'app_deps.dart';
import 'resource_view_model.dart';

/// Satu cabang = satu tenant di aplikasi POS (T001, T002, ...). Hanya admin platform yang boleh
/// menambah/mengubah cabang -- batas jumlah cabang ditentukan paket langganan dan ditegakkan trigger
/// database. Cabang TIDAK BISA dihapus bila masih punya pengguna, stok, penjualan, atau retur.
const cabangLimit = 25;
const _path = '/cabang';

TenantFilters parseCabangFilters(Map<String, String> p) => TenantFilters(client: p['client'] ?? '', cari: (p['cari'] ?? '').trim(), offset: parseOffset(p['offset']));

class CabangData {
  const CabangData({required this.page, required this.pengguna});
  final PageResult<Tenant> page;
  final Map<String, int> pengguna;
}

class CabangViewModel extends ResourceViewModel<CabangData> {
  CabangViewModel(super.deps, this.go, this.filters);
  final Go go;
  final TenantFilters filters;

  @override
  Future<Result<CabangData>> fetch() async {
    final halaman = await deps.tenants.page(filters, cabangLimit);
    if (halaman case Err(:final error)) return Err(error);
    final page = (halaman as Ok<PageResult<Tenant>>).data;
    final pengguna = await deps.tenants.countUsers(page.rows.map((t) => t.id).toList());
    return Ok(CabangData(page: page, pengguna: pengguna));
  }

  void apply(String client, String cari) => go(_path, {'client': client, 'cari': cari.trim()});
  void clear() => go(_path);
  void goPage(int offset) => go(_path, {'client': filters.client, 'cari': filters.cari, 'offset': '$offset'});

  Future<void> tambah() {
    final api = deps.lookups.api;
    final aktif = api.clientOptions(status: 'aktif');
    final opsiClient = aktif.isEmpty ? api.clientOptions() : aktif;
    return deps.dialog.form(FormSpec(
      title: 'Tambah cabang',
      note: 'Jumlah cabang dibatasi paket langganan client.',
      submitText: 'Simpan cabang',
      fields: [
        FormFieldSpec(name: 'client', label: 'Client pemilik', type: FieldType.select, required: true, options: opsiClient),
        const FormFieldSpec(name: 'nama', label: 'Nama cabang', required: true, placeholder: 'cth: Cabang Pasar', maxLength: 60, hint: 'ID cabang (T00x) dibuat otomatis oleh database.'),
      ],
      values: {'client': filters.client.isNotEmpty ? filters.client : (aktif.isEmpty ? '' : aktif.first.value)},
      onSubmit: (v) async {
        final hasil = await deps.tenants.create(v['client'].toString(), v['nama'].toString());
        switch (hasil) {
          case Err(:final error):
            return SubmitFail(pesanError(error));
          case Ok(:final data):
            deps.toast.show('Cabang ${data.id} berhasil dibuat.', type: ToastType.success);
            await deps.lookups.refresh();
            deps.reload.reload();
            return const SubmitOk();
        }
      },
    ));
  }

  Future<void> ubah(Tenant baris) => deps.dialog.form(FormSpec(
        title: 'Ubah cabang ${baris.id}',
        submitText: 'Simpan perubahan',
        fields: const [FormFieldSpec(name: 'nama', label: 'Nama cabang', required: true, maxLength: 60)],
        values: {'nama': baris.name},
        onSubmit: (v) async {
          final hasil = await deps.tenants.rename(baris.id, v['nama'].toString());
          if (hasil case Err(:final error)) return SubmitFail(pesanError(error));
          deps.toast.show('Nama cabang disimpan.', type: ToastType.success);
          await deps.lookups.refresh();
          deps.reload.reload();
          return const SubmitOk();
        },
      ));

  Future<void> hapus(Tenant baris) async {
    final yakin = await deps.dialog.confirmDelete('Hapus cabang',
        'Hapus cabang "${baris.name}" (${baris.id})? Cabang yang masih punya pengguna, stok, penjualan, atau retur akan ditolak oleh database -- itu pengaman agar data tidak hilang.');
    if (!yakin) return;
    final hasil = await deps.tenants.delete(baris.id);
    if (hasil case Err(:final error)) {
      final pesan = isReferenceConflict(error) ? 'Cabang tidak bisa dihapus karena masih memiliki data (pengguna/stok/penjualan/retur).' : pesanError(error);
      return deps.toast.show(pesan, type: ToastType.danger, duration: const Duration(seconds: 8));
    }
    deps.toast.show('Cabang dihapus.', type: ToastType.success);
    await deps.lookups.refresh();
    deps.reload.reload();
  }
}
