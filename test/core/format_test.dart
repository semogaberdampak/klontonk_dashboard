import 'package:flutter_test/flutter_test.dart';
import 'package:klontonk_dashboard/core/format.dart';

void main() {
  group('toNum', () {
    test('menerima angka, string numeric, dan mengabaikan sisanya', () {
      expect(toNum(5), 5);
      expect(toNum('12.5'), 12.5);
      expect(toNum('abc'), 0);
      expect(toNum(null), 0);
    });
  });

  group('format angka', () {
    test('formatNumber memakai pemisah ribuan Indonesia', () {
      expect(formatNumber(1944), '1.944');
    });

    test('formatRupiah memberi awalan Rp dan spasi', () {
      expect(formatRupiah(60890000), 'Rp 60.890.000');
      expect(formatRupiah('87500'), 'Rp 87.500');
    });
  });

  group('tanggal', () {
    test('formatDate tidak menggeser tanggal murni', () {
      expect(formatDate('2026-05-20'), '20 Mei 2026');
    });

    test('formatDate mengubah waktu UTC ke Jakarta', () {
      expect(formatDate('2026-05-20T20:00:00Z'), '21 Mei 2026');
    });

    test('formatDateTime memakai UTC+7', () {
      expect(formatDateTime('2026-10-12T09:15:00Z'), '12 Okt 2026, 16.15');
    });

    test('nilai kosong atau rusak menjadi tanda minus', () {
      expect(formatDate(null), '-');
      expect(formatDate(''), '-');
      expect(formatDateTime('bukan tanggal'), '-');
    });
  });

  group('daysLabel', () {
    test('menyebut sisa, hari ini, dan lewat', () {
      expect(daysLabel(9), 'sisa 9 hari');
      expect(daysLabel(0), 'berakhir hari ini');
      expect(daysLabel(-12), 'lewat 12 hari');
      expect(daysLabel(null), 'tanpa langganan');
    });
  });

  group('subTone', () {
    test('menentukan warna lencana langganan', () {
      expect(subTone('berhenti', 100), Tone.bad);
      expect(subTone('aktif', -1), Tone.bad);
      expect(subTone('aktif', 10), Tone.warn);
      expect(subTone('jatuh_tempo', 90), Tone.warn);
      expect(subTone('trial', 30), Tone.info);
      expect(subTone('aktif', 90), Tone.ok);
    });
  });

  group('relTime', () {
    final now = DateTime.utc(2026, 10, 12, 12);

    test('menyatakan selisih waktu dalam bahasa Indonesia', () {
      expect(relTime('2026-10-12T11:59:40Z', now: now), 'baru saja');
      expect(relTime('2026-10-12T11:30:00Z', now: now), '30 menit lalu');
      expect(relTime('2026-10-12T06:00:00Z', now: now), '6 jam lalu');
      expect(relTime('2026-10-09T12:00:00Z', now: now), '3 hari lalu');
    });
  });

  group('prettyDetail', () {
    test('menampilkan perubahan dari -> jadi', () {
      expect(prettyDetail({'qty': {'dari': 10, 'jadi': 8}}), 'qty: 10 -> 8');
    });

    test('melewati nilai null dan menggabungkan dengan |', () {
      expect(prettyDetail({'a': 1, 'b': null, 'c': 'x'}), 'a: 1 | c: x');
      expect(prettyDetail(null), '');
    });
  });

  test('initialOf mengambil huruf pertama kapital', () {
    expect(initialOf('budi'), 'B');
    expect(initialOf('  '), '?');
    expect(initialOf(null), '?');
  });
}
