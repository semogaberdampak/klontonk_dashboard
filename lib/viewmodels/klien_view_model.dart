import '../core/format.dart';
import '../core/query.dart';
import '../core/result.dart';
import '../data/models/models.dart';
import '../data/repositories/client_repository.dart';
import '../data/repositories/overview_repository.dart';
import '../services/form_types.dart';
import '../services/services.dart';
import 'app_deps.dart';
import 'resource_view_model.dart';

/// Sumber data: view v_client_overview -- angka cabang/pengguna/transaksi/omzet dihitung di database.
/// Pembuatan client memakai RPC create_client_with_plan() agar client + langganan trial dibuat
/// dalam satu transaksi (tidak mungkin setengah jadi).
const klienLimit = 25;
const _path = '/klien';
const _statuses = ['aktif', 'suspend', 'berhenti'];

const statusOptions = [Option('', 'Semua status'), Option('aktif', 'Aktif'), Option('suspend', 'Suspend'), Option('berhenti', 'Berhenti')];

Tone statusTone(String status) => status == 'aktif' ? Tone.ok : (status == 'suspend' ? Tone.warn : Tone.bad);

ClientFilters parseKlienFilters(Map<String, String> p) => ClientFilters(cari: (p['cari'] ?? '').trim(), status: oneOf(p['status'], _statuses), offset: parseOffset(p['offset']));

class KlienViewModel extends ResourceViewModel<PageResult<ClientOverview>> {
  KlienViewModel(super.deps, this.go, this.filters);
  final Go go;
  final ClientFilters filters;

  @override
  Future<Result<PageResult<ClientOverview>>> fetch() => deps.overview.page(filters, klienLimit);

  void apply(String cari, String status) => go(_path, {'cari': cari.trim(), 'status': status});
  void clear() => go(_path);
  void goPage(int offset) => go(_path, {'cari': filters.cari, 'status': filters.status, 'offset': '$offset'});

  Future<void> tambah() {
    final paket = deps.lookups.api.planOptions(excludeInternal: true);
    final opsiPaket = paket.isEmpty ? const [Option('internal', 'Internal (non-langganan)')] : paket;
    return deps.dialog.form(FormSpec(
      title: 'Tambah client',
      note: 'Client + langganan trial dibuat sekaligus. Cabang dan akun dibuat setelah ini.',
      submitText: 'Simpan client',
      wide: true,
      fields: [
        const FormFieldSpec(name: 'nama', label: 'Nama client / usaha', required: true, placeholder: 'cth: Warung Bu Sari', maxLength: 80),
        FormFieldSpec(name: 'paket', label: 'Paket awal', type: FieldType.select, required: true, options: opsiPaket, half: true),
        const FormFieldSpec(name: 'trial', label: 'Masa trial (hari)', type: FieldType.number, half: true, hint: 'Isi 0 untuk langsung berstatus aktif.'),
        const FormFieldSpec(name: 'kontak_nama', label: 'Nama kontak', placeholder: 'cth: Bu Sari', half: true, maxLength: 60),
        const FormFieldSpec(name: 'kontak_telepon', label: 'Telepon / WhatsApp', placeholder: 'cth: 081234567890', half: true, maxLength: 24),
        const FormFieldSpec(name: 'kontak_email', label: 'Email kontak', type: FieldType.email, placeholder: 'cth: sari@contoh.com', maxLength: 80),
        const FormFieldSpec(name: 'catatan', label: 'Catatan', type: FieldType.textarea, maxLength: 200),
      ],
      values: {'paket': opsiPaket.first.value, 'trial': 14},
      onSubmit: (v) async {
        String? opsional(String k) => (v[k] ?? '').toString().isEmpty ? null : v[k].toString();
        final hasil = await deps.clients.createWithPlan(NewClient(
          name: v['nama'].toString(),
          planCode: v['paket'].toString(),
          contactName: opsional('kontak_nama'),
          contactPhone: opsional('kontak_telepon'),
          contactEmail: opsional('kontak_email'),
          trialDays: toNum(v['trial']).toInt(),
          note: opsional('catatan'),
        ));
        if (hasil case Err(:final error)) return SubmitFail(pesanError(error));
        deps.toast.show('Client "${v['nama']}" dibuat.', type: ToastType.success);
        await deps.lookups.refresh();
        deps.reload.reload();
        return const SubmitOk();
      },
    ));
  }

  Future<void> ubah(ClientOverview baris) => deps.dialog.form(FormSpec(
        title: 'Ubah client ${baris.id}',
        submitText: 'Simpan perubahan',
        wide: true,
        fields: const [
          FormFieldSpec(name: 'nama', label: 'Nama client / usaha', required: true, maxLength: 80),
          FormFieldSpec(name: 'status', label: 'Status client', type: FieldType.select, half: true, options: [
            Option('aktif', 'Aktif (bisa memakai POS)'),
            Option('suspend', 'Suspend (tidak dihentikan permanen)'),
            Option('berhenti', 'Berhenti (tidak berlangganan lagi)'),
          ]),
          FormFieldSpec(name: 'kontak_nama', label: 'Nama kontak', half: true, maxLength: 60),
          FormFieldSpec(name: 'kontak_telepon', label: 'Telepon / WhatsApp', half: true, maxLength: 24),
          FormFieldSpec(name: 'kontak_email', label: 'Email kontak', type: FieldType.email, half: true, maxLength: 80),
          FormFieldSpec(name: 'catatan', label: 'Catatan', type: FieldType.textarea, maxLength: 200),
        ],
        values: {
          'nama': baris.name,
          'status': baris.status,
          'kontak_nama': baris.contactName ?? '',
          'kontak_telepon': baris.contactPhone ?? '',
          'kontak_email': baris.contactEmail ?? '',
          'catatan': baris.note ?? '',
        },
        onSubmit: (v) async {
          String? opsional(String k) => (v[k] ?? '').toString().isEmpty ? null : v[k].toString();
          final status = oneOf(v['status']?.toString(), _statuses);
          final hasil = await deps.clients.update(baris.id, {
            'name': v['nama'].toString(),
            'status': status.isEmpty ? baris.status : status,
            'contact_name': opsional('kontak_nama'),
            'contact_phone': opsional('kontak_telepon'),
            'contact_email': opsional('kontak_email'),
            'note': opsional('catatan'),
          });
          if (hasil case Err(:final error)) return SubmitFail(pesanError(error));
          deps.toast.show('Perubahan client disimpan.', type: ToastType.success);
          await deps.lookups.refresh();
          deps.reload.reload();
          return const SubmitOk();
        },
      ));

  Future<void> ubahStatus(ClientOverview baris, String statusBaru) async {
    final suspend = statusBaru == 'suspend';
    final yakin = await deps.dialog.confirm(
      title: suspend ? 'Nonaktifkan client' : 'Aktifkan client',
      message: suspend ? 'Client ini ditandai suspend. Catatan: menulis data di POS tetap dikendalikan masa langganan, bukan status ini.' : 'Client ini akan ditandai aktif kembali.',
      confirmText: 'Lanjutkan',
      cancelText: 'Batal',
      danger: suspend,
    );
    if (!yakin) return;
    final hasil = await deps.clients.setStatus(baris.id, statusBaru);
    if (hasil case Err(:final error)) return deps.toast.show(pesanError(error), type: ToastType.danger);
    deps.toast.show('Status client diperbarui.', type: ToastType.success);
    deps.reload.reload();
  }
}
