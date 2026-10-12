import '../core/format.dart';
import '../core/result.dart';
import '../data/models/models.dart';
import 'app_deps.dart';
import 'resource_view_model.dart';

/// Satu layar untuk melihat kondisi seluruh client: langganan yang mendekati akhir,
/// error terbaru dari perangkat client, dan aktivitas terakhir.
const ambangHari = 14; // langganan dianggap "segera berakhir" bila <= 14 hari

bool needsAttention(ClientOverview c) =>
    c.status != 'aktif' || c.subStatus == 'berhenti' || c.daysLeft == null || c.daysLeft! <= ambangHari || c.errors7d > 0;

String alasanPerhatian(ClientOverview c) {
  final bagian = <String>[];
  if (c.status == 'suspend') bagian.add('client disuspend');
  if (c.status == 'berhenti') bagian.add('client berhenti');
  if (c.subStatus == 'berhenti') bagian.add('langganan berhenti');
  if (c.daysLeft == null) {
    bagian.add('belum ada langganan');
  } else if (c.daysLeft! < 0) {
    bagian.add('langganan sudah berakhir');
  } else if (c.daysLeft! <= ambangHari) {
    bagian.add('langganan segera berakhir');
  }
  if (c.errors7d > 0) bagian.add('${formatNumber(c.errors7d)} error dalam 7 hari');
  return bagian.isEmpty ? '-' : bagian.join(', ');
}

num sumOf(List<ClientOverview> rows, num Function(ClientOverview) pick) => rows.fold<num>(0, (total, row) => total + pick(row));

class RingkasanData {
  const RingkasanData({required this.klien, this.aktivitas, this.errors});
  final List<ClientOverview> klien;

  /// null = log belum bisa dibaca (tidak menggagalkan halaman).
  final List<AuditLog>? aktivitas;
  final List<ClientEvent>? errors;
}

class RingkasanViewModel extends ResourceViewModel<RingkasanData> {
  RingkasanViewModel(super.deps, this.go);
  final Go go;

  @override
  Future<Result<RingkasanData>> fetch() async {
    final hasil = await Future.wait([deps.overview.list(), deps.logs.recentAudit(8), deps.logs.recentErrors(5)]);
    final overview = hasil[0] as Result<List<ClientOverview>>;
    if (overview case Err(:final error)) return Err(error);
    final log = hasil[1] as Result<List<AuditLog>>;
    final errors = hasil[2] as Result<List<ClientEvent>>;
    return Ok(RingkasanData(
      klien: (overview as Ok<List<ClientOverview>>).data,
      aktivitas: log is Ok<List<AuditLog>> ? log.data : null,
      errors: errors is Ok<List<ClientEvent>> ? errors.data : null,
    ));
  }
}
