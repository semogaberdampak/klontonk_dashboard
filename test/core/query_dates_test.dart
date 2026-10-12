import 'package:flutter_test/flutter_test.dart';
import 'package:klontonk_dashboard/core/dates.dart';
import 'package:klontonk_dashboard/core/query.dart';

void main() {
  group('query', () {
    test('bersihkanKataKunci membuang karakter sintaks PostgREST', () {
      expect(bersihkanKataKunci('a,b(c)*%\\d'), 'a b c    d');
      expect(bersihkanKataKunci(null), '');
    });

    test('parseOffset tidak pernah negatif atau rusak', () {
      expect(parseOffset('50'), 50);
      expect(parseOffset('-5'), 0);
      expect(parseOffset('x'), 0);
      expect(parseOffset(null), 0);
    });

    test('oneOf hanya menerima nilai yang diizinkan', () {
      expect(oneOf('aktif', ['aktif', 'suspend']), 'aktif');
      expect(oneOf('hapus', ['aktif', 'suspend']), '');
      expect(oneOf(null, ['aktif']), '');
    });
  });

  group('dates', () {
    final now = DateTime.utc(2026, 10, 12, 20); // 13 Okt 03.00 di Jakarta

    test('tanggalJakarta memakai hari kalender Jakarta', () {
      expect(tanggalJakarta(0, now), '2026-10-13');
      expect(tanggalJakarta(-29, now), '2026-09-14');
      expect(hariIni(now), '2026-10-13');
    });

    test('tambahHari melewati batas bulan dan tahun', () {
      expect(tambahHari('2026-10-31', 1), '2026-11-01');
      expect(tambahHari('2026-12-31', 1), '2027-01-01');
      expect(tambahHari('2026-03-01', -1), '2026-02-28');
    });

    test('batasWaktu mengubah hari Jakarta ke ISO UTC', () {
      expect(batasWaktu('2026-10-13'), '2026-10-12T17:00:00.000Z');
      expect(batasWaktu('2026-10-13', akhir: true), '2026-10-13T16:59:59.999Z');
      expect(batasWaktu(''), '');
    });
  });
}
