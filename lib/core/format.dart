import 'package:intl/intl.dart';

/// Pemformat angka, uang, dan waktu (zona Asia/Jakarta, UTC+7 tanpa DST) untuk seluruh dashboard.

const _jakarta = Duration(hours: 7);

final _angka = NumberFormat.decimalPattern('id_ID');
final _rupiah = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp', decimalDigits: 0);

/// Angka dari nilai JSON yang bisa berupa int, double, atau String (kolom numeric).
num toNum(Object? value) {
  if (value is num) return value;
  if (value is String) return num.tryParse(value) ?? 0;
  return 0;
}

String formatNumber(Object? value) => _angka.format(toNum(value));
String formatRupiah(Object? value) => _rupiah.format(toNum(value)).replaceAll('Rp', 'Rp ').replaceAll('  ', ' ');

DateTime? _parse(String? value) => (value == null || value.isEmpty) ? null : DateTime.tryParse(value);

DateTime _toJakarta(DateTime date) => date.toUtc().add(_jakarta);

const _bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

String _pad(int n) => n.toString().padLeft(2, '0');

String formatDate(String? value) {
  final parsed = _parse(value);
  if (parsed == null) return '-';
  // Tanggal murni ("2026-05-20") tidak digeser zona waktu.
  final d = value!.length <= 10 ? parsed : _toJakarta(parsed);
  return '${d.day} ${_bulan[d.month - 1]} ${d.year}';
}

String formatDateTime(String? value) {
  final parsed = _parse(value);
  if (parsed == null) return '-';
  final d = _toJakarta(parsed);
  return '${d.day} ${_bulan[d.month - 1]} ${d.year}, ${_pad(d.hour)}.${_pad(d.minute)}';
}

/// Label sisa masa langganan dari jumlah hari (boleh negatif).
String daysLabel(Object? days) {
  if (days == null || days == '') return 'tanpa langganan';
  final n = num.tryParse(days.toString());
  if (n == null) return '-';
  final hari = n.toInt();
  if (hari == 0) return 'berakhir hari ini';
  if (hari > 0) return 'sisa $hari hari';
  return 'lewat ${hari.abs()} hari';
}

enum Tone { none, ok, warn, bad, info }

/// Warna lencana untuk status langganan. Perilaku bawaan: sisa hari kosong (null) dihitung 0 -> warn.
Tone subTone(String? status, Object? days) {
  final n = days == null ? 0 : num.tryParse(days.toString());
  if (status == 'berhenti') return Tone.bad;
  if (n == null) return Tone.bad;
  if (n < 0) return Tone.bad;
  if (status == 'jatuh_tempo' || n <= 14) return Tone.warn;
  if (status == 'trial') return Tone.info;
  return Tone.ok;
}

/// "3 menit lalu" untuk kolom waktu pada log.
String relTime(String? value, {DateTime? now}) {
  final parsed = _parse(value);
  if (parsed == null) return '-';
  final detik = (now ?? DateTime.now()).difference(parsed).inSeconds;
  if (detik < 60) return 'baru saja';
  final menit = (detik / 60).round();
  if (menit < 60) return '$menit menit lalu';
  final jam = (menit / 60).round();
  if (jam < 24) return '$jam jam lalu';
  final hari = (jam / 24).round();
  if (hari < 30) return '$hari hari lalu';
  return formatDate(value);
}

String _ringkasNilai(Object? value) {
  if (value == null) return '(kosong)';
  if (value is Map || value is List) {
    final teks = value.toString();
    return teks.length > 220 ? '${teks.substring(0, 217)}...' : teks;
  }
  return value.toString();
}

/// Ubah isi kolom `detail` audit menjadi teks yang bisa dibaca manusia:
///   {qty: {dari: 10, jadi: 8}}  ->  "qty: 10 -> 8"
String prettyDetail(Map<String, dynamic>? detail) {
  if (detail == null) return '';
  final bagian = <String>[];
  detail.forEach((kunci, nilai) {
    if (nilai == null) return;
    if (nilai is Map && (nilai.containsKey('dari') || nilai.containsKey('jadi'))) {
      bagian.add('$kunci: ${_ringkasNilai(nilai['dari'])} -> ${_ringkasNilai(nilai['jadi'])}');
    } else {
      bagian.add('$kunci: ${_ringkasNilai(nilai)}');
    }
  });
  return bagian.join(' | ');
}

String initialOf(String? name) {
  final teks = (name ?? '').trim();
  return teks.isEmpty ? '?' : teks.substring(0, 1).toUpperCase();
}
