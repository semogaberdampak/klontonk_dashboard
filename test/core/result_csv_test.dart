import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:klontonk_dashboard/core/csv.dart';
import 'package:klontonk_dashboard/core/result.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  group('AppError.from', () {
    test('PostgrestException membawa kode dan pesan', () {
      final e = AppError.from(const PostgrestException(message: 'duplikat', code: '23505'));
      expect(e.code, '23505');
      expect(e.expired, isFalse);
      expect(pesanError(e), 'Data dengan kunci yang sama sudah ada.');
    });

    test('JWT kedaluwarsa ditandai expired (401)', () {
      final e = AppError.from(const PostgrestException(message: 'JWT expired', code: 'PGRST301'));
      expect(e.expired, isTrue);
      expect(e.status, 401);
      expect(pesanError(e), 'Sesi berakhir. Silakan login ulang.');
    });

    test('AuthException 401 ditandai expired', () {
      expect(AppError.from(const AuthException('x', statusCode: '401')).expired, isTrue);
    });

    test('timeout dianggap masalah jaringan', () {
      final e = AppError.from(TimeoutException('lama'));
      expect(e.status, 0);
      expect(e.message, AppError.networkMessage);
    });
  });

  group('guard', () {
    test('mengembalikan Ok saat sukses', () async {
      final r = await guard(() async => 7);
      expect(r, isA<Ok<int>>());
      expect((r as Ok<int>).data, 7);
    });

    test('mengubah exception menjadi Err tanpa melempar', () async {
      final r = await guard<int>(() async => throw const PostgrestException(message: 'x', code: '42501'));
      expect(r, isA<Err<int>>());
      expect(pesanError((r as Err<int>).error), 'Tidak punya hak untuk tindakan ini.');
    });
  });

  test('isReferenceConflict mengenali FK dan status 409', () {
    expect(isReferenceConflict(const AppError(status: 400, code: '23503', message: '')), isTrue);
    expect(isReferenceConflict(const AppError(status: 409, message: '')), isTrue);
    expect(isReferenceConflict(const AppError(status: 400, message: '')), isFalse);
  });

  group('toCsv', () {
    final kolom = [CsvColumn<Map<String, Object?>>('nama', (r) => r['nama']), CsvColumn<Map<String, Object?>>('nilai', (r) => r['nilai'])];

    test('memakai titik koma dan header', () {
      expect(toCsv([{'nama': 'a', 'nilai': 1}], kolom), 'nama;nilai\na;1');
    });

    test('mengutip sel berisi titik koma, kutip, atau baris baru', () {
      expect(toCsv([{'nama': 'a;b', 'nilai': 'x"y'}], kolom), 'nama;nilai\n"a;b";"x""y"');
    });

    test('sel null menjadi kosong', () {
      expect(toCsv([{'nama': null, 'nilai': 2}], kolom), 'nama;nilai\n;2');
    });
  });
}
