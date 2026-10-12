import 'platform_stub.dart' if (dart.library.js_interop) 'platform_web.dart' as platform;

/// Ekspor CSV. Pemisah titik koma agar langsung rapi di Excel versi Indonesia.
class CsvColumn<T> {
  const CsvColumn(this.label, this.value);
  final String label;
  final Object? Function(T row) value;
}

String _cell(Object? value) {
  final teks = value == null ? '' : value.toString();
  return RegExp(r'[";\n]').hasMatch(teks) ? '"${teks.replaceAll('"', '""')}"' : teks;
}

String toCsv<T>(List<T> rows, List<CsvColumn<T>> columns) {
  final head = columns.map((c) => _cell(c.label)).join(';');
  final body = rows.map((row) => columns.map((c) => _cell(c.value(row))).join(';')).join('\n');
  return '$head\n$body';
}

/// Unduh berkas CSV (BOM di depan agar Excel membaca UTF-8 dengan benar). Hanya jalan di web.
void downloadCsv(String filename, String csv) => platform.downloadText(filename, '﻿$csv', 'text/csv;charset=utf-8');
