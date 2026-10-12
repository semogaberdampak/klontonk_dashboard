/// Tanggal kalender dalam zona Asia/Jakarta (UTC+7, tanpa DST).
const _jakarta = Duration(hours: 7);

String _fmt(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// "YYYY-MM-DD" hari ini di Jakarta, digeser [offsetHari] hari.
String tanggalJakarta([int offsetHari = 0, DateTime? now]) {
  final base = (now ?? DateTime.now()).toUtc().add(_jakarta);
  return _fmt(base.add(Duration(days: offsetHari)));
}

String hariIni([DateTime? now]) => tanggalJakarta(0, now);

/// Tambah (atau kurangi) hari pada tanggal "YYYY-MM-DD".
String tambahHari(String tanggal, int jumlah) {
  final d = DateTime.parse('${tanggal}T00:00:00Z');
  return _fmt(d.add(Duration(days: jumlah)));
}

/// Batas hari (Jakarta) -> waktu ISO UTC yang tepat. String kosong bila tanggal kosong.
String batasWaktu(String tanggal, {bool akhir = false}) {
  if (tanggal.isEmpty) return '';
  final jam = akhir ? '23:59:59.999' : '00:00:00.000';
  return DateTime.parse('${tanggal}T$jam+07:00').toUtc().toIso8601String();
}
