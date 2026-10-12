import '../core/dates.dart';
import '../core/format.dart';
import '../core/query.dart';
import '../core/result.dart';
import '../data/models/models.dart';
import '../data/repositories/subscription_repository.dart';
import '../services/form_types.dart';
import '../services/services.dart';
import 'app_deps.dart';
import 'resource_view_model.dart';

/// Yang benar-benar mengunci POS adalah trigger di database, bukan halaman ini. Jadi mengubah
/// status di sini langsung berpengaruh ke client.
const langgananLimit = 25;
const _path = '/langganan';
const _perpanjangHari = 30;
const _statuses = ['trial', 'aktif', 'jatuh_tempo', 'berhenti'];

const statusFilterOptions = [
  Option('', 'Semua status'),
  Option('trial', 'Trial'),
  Option('aktif', 'Aktif'),
  Option('jatuh_tempo', 'Jatuh tempo'),
  Option('berhenti', 'Berhenti'),
];
final _statusFormOptions = statusFilterOptions.sublist(1);

class LanggananSummary {
  const LanggananSummary({required this.berlaku, required this.trial, required this.perhatian, required this.potensi});
  final List<ClientOverview> berlaku;
  final List<ClientOverview> trial;
  final List<ClientOverview> perhatian;

  /// Total harga per bulan dari paket yang sedang berlaku.
  final num potensi;
}

LanggananSummary summarize(List<ClientOverview> ringkas) {
  final berlaku = ringkas.where((c) => (c.subStatus == 'trial' || c.subStatus == 'aktif') && (c.daysLeft ?? -1) >= 0).toList();
  final perhatian = ringkas.where((c) => c.daysLeft == null || c.daysLeft! < 0 || c.daysLeft! <= 14 || c.subStatus == 'berhenti').toList();
  return LanggananSummary(
    berlaku: berlaku,
    trial: berlaku.where((c) => c.subStatus == 'trial').toList(),
    perhatian: perhatian,
    potensi: berlaku.fold<num>(0, (t, c) => t + (c.priceMonth ?? 0)),
  );
}

SubscriptionFilters parseLanggananFilters(Map<String, String> p) => SubscriptionFilters(client: p['client'] ?? '', status: oneOf(p['status'], _statuses), offset: parseOffset(p['offset']));

class LanggananData {
  const LanggananData({required this.riwayat, required this.ringkas});
  final PageResult<Subscription> riwayat;
  final List<ClientOverview> ringkas;
}

class LanggananViewModel extends ResourceViewModel<LanggananData> {
  LanggananViewModel(super.deps, this.go, this.filters);
  final Go go;
  final SubscriptionFilters filters;

  @override
  Future<Result<LanggananData>> fetch() async {
    final hasil = await Future.wait([deps.subscriptions.page(filters, langgananLimit), deps.overview.subscriptionSummary()]);
    final riwayat = hasil[0] as Result<PageResult<Subscription>>;
    if (riwayat case Err(:final error)) return Err(error);
    final ringkas = hasil[1] as Result<List<ClientOverview>>;
    return Ok(LanggananData(riwayat: (riwayat as Ok<PageResult<Subscription>>).data, ringkas: ringkas is Ok<List<ClientOverview>> ? ringkas.data : const []));
  }

  void apply(String client, String status) => go(_path, {'client': client, 'status': status});
  void clear() => go(_path);
  void goPage(int offset) => go(_path, {'client': filters.client, 'status': filters.status, 'offset': '$offset'});

  Future<void> _saved(String message, {bool withLookups = false}) async {
    deps.toast.show(message, type: ToastType.success);
    if (withLookups) await deps.lookups.refresh();
    deps.reload.reload();
  }

  Future<void> tambah() {
    final api = deps.lookups.api;
    final klien = api.clientOptions();
    final paket = api.planOptions(activeOnly: true);
    final opsiPaket = paket.isEmpty ? const [Option('internal', 'Internal')] : paket;
    return deps.dialog.form(FormSpec(
      title: 'Catat langganan',
      note: 'Gunakan untuk memperpanjang atau mengganti paket. Beberapa baris langganan boleh ada; yang dihitung sebagai berlaku adalah yang paling akhir masa berlakunya.',
      submitText: 'Simpan langganan',
      wide: true,
      fields: [
        FormFieldSpec(name: 'client', label: 'Client', type: FieldType.select, required: true, options: klien),
        FormFieldSpec(name: 'paket', label: 'Paket', type: FieldType.select, required: true, options: opsiPaket),
        const FormFieldSpec(name: 'mulai', label: 'Mulai', type: FieldType.date, required: true, half: true),
        const FormFieldSpec(name: 'berakhir', label: 'Berakhir', type: FieldType.date, required: true, half: true),
        FormFieldSpec(name: 'status', label: 'Status', type: FieldType.select, half: true, options: _statusFormOptions),
        const FormFieldSpec(name: 'catatan', label: 'Catatan', half: true, maxLength: 200, placeholder: 'cth: pembayaran transfer 1 tahun'),
      ],
      values: {
        'client': filters.client.isNotEmpty ? filters.client : (klien.isEmpty ? '' : klien.first.value),
        'paket': opsiPaket.first.value,
        'mulai': hariIni(),
        'berakhir': tambahHari(hariIni(), _perpanjangHari),
        'status': 'aktif',
      },
      onSubmit: (v) async {
        final mulai = v['mulai'].toString();
        final berakhir = v['berakhir'].toString();
        if (berakhir.compareTo(mulai) < 0) return const SubmitFail('Tanggal berakhir tidak boleh sebelum tanggal mulai.');
        final status = oneOf(v['status']?.toString(), _statuses);
        final hasil = await deps.subscriptions.create(
          clientId: v['client'].toString(),
          planCode: v['paket'].toString(),
          startedAt: mulai,
          expiresAt: berakhir,
          status: status.isEmpty ? 'aktif' : status,
          note: (v['catatan'] ?? '').toString().isEmpty ? null : v['catatan'].toString(),
        );
        if (hasil case Err(:final error)) return SubmitFail(pesanError(error));
        await _saved('Langganan disimpan.', withLookups: true);
        return const SubmitOk();
      },
    ));
  }

  Future<void> ubah(Subscription baris) => deps.dialog.form(FormSpec(
        title: 'Ubah langganan ${baris.clientName ?? baris.clientId}',
        submitText: 'Simpan perubahan',
        wide: true,
        fields: [
          FormFieldSpec(name: 'paket', label: 'Paket', type: FieldType.select, required: true, options: deps.lookups.api.planOptions(activeOnly: true)),
          FormFieldSpec(name: 'status', label: 'Status', type: FieldType.select, half: true, options: _statusFormOptions),
          const FormFieldSpec(name: 'berakhir', label: 'Berakhir', type: FieldType.date, half: true, required: true),
          const FormFieldSpec(name: 'catatan', label: 'Catatan', maxLength: 200),
        ],
        values: {'paket': baris.planCode, 'status': baris.status, 'berakhir': baris.expiresAt, 'catatan': baris.note ?? ''},
        onSubmit: (v) async {
          final berakhir = v['berakhir'].toString();
          if (berakhir.compareTo(baris.startedAt) < 0) return const SubmitFail('Tanggal berakhir tidak boleh sebelum tanggal mulai.');
          final status = oneOf(v['status']?.toString(), _statuses);
          final hasil = await deps.subscriptions.update(baris.id,
              planCode: v['paket'].toString(), status: status.isEmpty ? baris.status : status, expiresAt: berakhir, note: (v['catatan'] ?? '').toString().isEmpty ? null : v['catatan'].toString());
          if (hasil case Err(:final error)) return SubmitFail(pesanError(error));
          await _saved('Langganan diperbarui.');
          return const SubmitOk();
        },
      ));

  Future<void> sinkron() async {
    final yakin = await deps.dialog.confirm(
      title: 'Sinkronkan status langganan',
      message: 'Semua langganan trial/aktif yang masa berlakunya sudah lewat akan ditandai "jatuh tempo". Lanjutkan?',
      confirmText: 'Ya, Sinkronkan',
      cancelText: 'Batal',
    );
    if (!yakin) return;
    final hasil = await deps.subscriptions.markExpired(hariIni());
    switch (hasil) {
      case Err(:final error):
        deps.toast.show(pesanError(error), type: ToastType.danger);
      case Ok(:final data):
        deps.toast.show(data > 0 ? '$data langganan ditandai jatuh tempo.' : 'Tidak ada langganan yang perlu diubah.', type: data > 0 ? ToastType.success : ToastType.info);
        deps.reload.reload();
    }
  }

  Future<void> perpanjang(Subscription baris) async {
    final dasar = baris.expiresAt.compareTo(hariIni()) >= 0 ? baris.expiresAt : hariIni();
    final baru = tambahHari(dasar, _perpanjangHari);
    final yakin = await deps.dialog.confirm(
      title: 'Perpanjang langganan',
      message: 'Perpanjang sampai ${formatDate(baru)} (+$_perpanjangHari hari) dan tandai aktif?',
      confirmText: 'Ya, Perpanjang',
      cancelText: 'Batal',
    );
    if (!yakin) return;
    final hasil = await deps.subscriptions.extend(baris.id, baru);
    if (hasil case Err(:final error)) return deps.toast.show(pesanError(error), type: ToastType.danger);
    await _saved('Langganan diperpanjang sampai ${formatDate(baru)}.');
  }

  Future<void> hapus(Subscription baris) async {
    final yakin = await deps.dialog.confirmDelete('Hapus catatan langganan', 'Catatan langganan ini akan dihapus. Tindakan ini tercatat di log audit. Lanjutkan?');
    if (!yakin) return;
    final hasil = await deps.subscriptions.delete(baris.id);
    if (hasil case Err(:final error)) return deps.toast.show(pesanError(error), type: ToastType.danger);
    await _saved('Catatan langganan dihapus.');
  }
}

