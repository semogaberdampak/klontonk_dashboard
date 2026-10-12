import '../core/format.dart';
import '../core/platform_stub.dart' if (dart.library.js_interop) '../core/platform_web.dart' as platform;
import '../core/result.dart';
import '../data/models/models.dart';
import '../services/services.dart';
import 'resource_view_model.dart';

const retensiAuditDefault = 180; // 6 bulan
const retensiEventDefault = 60; // 2 bulan

/// Isian hari dari input; kembali ke nilai bawaan bila kosong, nol, atau bukan angka.
int daysOrDefault(String value, int fallback) {
  final n = int.tryParse(value.trim());
  return (n == null || n == 0) ? fallback : n;
}

class PengaturanViewModel extends ResourceViewModel<SystemCounts> {
  PengaturanViewModel(super.deps);

  @override
  Future<Result<SystemCounts>> fetch() async => Ok(await deps.system.counts());

  Future<void> pangkas(String auditText, String eventText) async {
    final audit = daysOrDefault(auditText, retensiAuditDefault);
    final event = daysOrDefault(eventText, retensiEventDefault);
    final yakin = await deps.dialog.confirm(
      title: 'Pangkas log lama',
      message: 'Hapus log audit lebih tua dari $audit hari dan log teknis lebih tua dari $event hari? Tindakan ini tidak bisa dibatalkan.',
      confirmText: 'Ya, Pangkas',
      cancelText: 'Batal',
      danger: true,
    );
    if (!yakin) return;

    final hasil = await deps.system.purgeOldLogs(audit, event);
    switch (hasil) {
      case Err(:final error):
        deps.toast.show(pesanError(error), type: ToastType.danger, duration: const Duration(seconds: 8));
      case Ok(:final data):
        deps.toast.show('Selesai: ${formatNumber(data.auditDeleted)} baris log audit dan ${formatNumber(data.eventsDeleted)} baris log teknis dihapus.',
            type: ToastType.success, duration: const Duration(seconds: 8));
        deps.reload.reload();
    }
  }

  Future<void> bersihkanCache() async {
    if (await platform.clearAppCache()) {
      deps.toast.show('Cache dibersihkan. Memuat ulang...', type: ToastType.success);
      await Future<void>.delayed(const Duration(milliseconds: 800));
      platform.reloadPage();
    } else {
      deps.toast.show('Gagal membersihkan cache. Coba muat ulang halaman.', type: ToastType.warning);
    }
  }
}
