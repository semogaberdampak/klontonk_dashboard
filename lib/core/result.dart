import 'dart:async';
import 'dart:io' show SocketException;

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

/// Semua akses data mengembalikan [Result] dan TIDAK PERNAH melempar error: pemanggil
/// (ViewModel) cukup memeriksa hasilnya. status 0 = tidak ada jaringan / server tidak menjawab.
class AppError {
  const AppError({required this.status, this.code = '', required this.message, this.expired = false});

  final int status;
  final String code;
  final String message;

  /// true bila sesi login sudah tidak berlaku (HTTP 401).
  final bool expired;

  static const networkMessage = 'Server tidak terjangkau. Periksa koneksi lalu coba lagi.';

  factory AppError.network() => const AppError(status: 0, code: 'network', message: networkMessage);

  /// Ubah exception Supabase (PostgREST / Auth) atau exception biasa menjadi [AppError].
  factory AppError.from(Object error) {
    if (error is PostgrestException) {
      final status = int.tryParse(error.code ?? '') ?? 0;
      // PostgREST mengirim kode SQLSTATE (mis. 23505) atau PGRST301 untuk JWT kedaluwarsa.
      final expired = error.code == 'PGRST301' || error.message.toLowerCase().contains('jwt expired');
      return AppError(status: expired ? 401 : (status >= 100 && status < 600 ? status : 400), code: error.code ?? '', message: error.message, expired: expired);
    }
    if (error is AuthException) {
      final status = int.tryParse(error.statusCode ?? '') ?? 400;
      return AppError(status: status, code: error.code ?? '', message: error.message, expired: status == 401);
    }
    if (error is SocketException || error is TimeoutException || error is http.ClientException) return AppError.network();
    return AppError(status: 0, message: error.toString());
  }
}

sealed class Result<T> {
  const Result();
}

final class Ok<T> extends Result<T> {
  const Ok(this.data);
  final T data;
}

final class Err<T> extends Result<T> {
  const Err(this.error);
  final AppError error;
}

/// Jalankan satu operasi data dan bungkus hasilnya; exception berubah menjadi [Err].
Future<Result<T>> guard<T>(Future<T> Function() operation) async {
  try {
    return Ok(await operation());
  } catch (error) {
    return Err(AppError.from(error));
  }
}

class PageResult<T> {
  const PageResult({required this.rows, required this.total});
  final List<T> rows;
  final int total;
}

/// Pesan siap tampil untuk kesalahan yang paling sering muncul.
String pesanError(AppError? error) {
  if (error == null) return 'Gagal. Coba lagi.';
  if (error.expired) return 'Sesi berakhir. Silakan login ulang.';
  switch (error.code) {
    case '23505':
      return 'Data dengan kunci yang sama sudah ada.';
    case '23503':
      return 'Masih terhubung dengan data lain, jadi tidak bisa diubah atau dihapus.';
    case '23514':
      return 'Nilai yang dimasukkan tidak memenuhi aturan database.';
    case '42501':
      return 'Tidak punya hak untuk tindakan ini.';
  }
  if (error.status == 403) return 'Tidak punya hak untuk tindakan ini.';
  if (error.status == 0) return error.message.isEmpty ? 'Server tidak terjangkau. Periksa koneksi.' : error.message;
  return error.message.isEmpty ? 'Gagal menyimpan. Coba lagi.' : error.message;
}

/// Kegagalan karena data masih dipakai tabel lain (FK): kode 23503 atau status 409.
bool isReferenceConflict(AppError error) => error.code == '23503' || error.status == 409;
