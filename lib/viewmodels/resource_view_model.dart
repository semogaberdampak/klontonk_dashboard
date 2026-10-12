import 'package:flutter/foundation.dart';

import '../core/result.dart';
import 'app_deps.dart';

enum ResourceStatus { loading, error, ready }

/// Dasar semua ViewModel halaman: memuat satu sumber data dan menyimpan statusnya
/// (memuat / error / siap). Sesi berakhir (401) otomatis mengembalikan pengguna ke login.
abstract class ResourceViewModel<T> extends ChangeNotifier {
  ResourceViewModel(this.deps);

  final AppDeps deps;

  ResourceStatus status = ResourceStatus.loading;
  T? data;
  String message = '';

  bool _disposed = false;
  int _token = 0;

  bool get isReady => status == ResourceStatus.ready && data != null;

  /// Isi ViewModel turunan: ambil data dari repository.
  Future<Result<T>> fetch();

  Future<void> load() async {
    final mine = ++_token;
    status = ResourceStatus.loading;
    notifyListeners();
    final result = await fetch();
    // Jawaban basi (navigasi lain sudah berjalan) dibuang.
    if (_disposed || mine != _token) return;
    switch (result) {
      case Ok(:final data):
        this.data = data;
        status = ResourceStatus.ready;
      case Err(:final error):
        if (error.expired) deps.auth.expire();
        message = pesanError(error);
        status = ResourceStatus.error;
    }
    notifyListeners();
  }

  @override
  void notifyListeners() {
    if (!_disposed) super.notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
