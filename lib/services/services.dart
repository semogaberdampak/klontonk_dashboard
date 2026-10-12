import 'package:flutter/material.dart';

import '../views/widgets/dialogs.dart';
import 'form_types.dart';

enum ToastType { info, success, warning, danger }

/// Notifikasi singkat (SnackBar). Tidak butuh BuildContext sehingga bisa dipakai ViewModel.
class ToastService {
  final messengerKey = GlobalKey<ScaffoldMessengerState>();

  void show(String message, {ToastType type = ToastType.info, Duration duration = const Duration(milliseconds: 3500)}) {
    final colors = {
      ToastType.info: const Color(0xFF1E293B),
      ToastType.success: const Color(0xFF14532D),
      ToastType.warning: const Color(0xFF78350F),
      ToastType.danger: const Color(0xFF7F1D1D),
    };
    messengerKey.currentState
      ?..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        content: Text(message),
        backgroundColor: colors[type],
        duration: duration,
        behavior: SnackBarBehavior.floating,
        width: 420,
      ));
  }
}

/// Dialog konfirmasi dan form generik. Tidak butuh BuildContext sehingga bisa dipakai ViewModel.
class DialogService {
  final navigatorKey = GlobalKey<NavigatorState>();

  BuildContext? get _context => navigatorKey.currentContext;

  /// Dialog konfirmasi. Mengembalikan true bila pengguna menekan tombol utama.
  Future<bool> confirm({String title = 'Pemberitahuan', String message = '', String confirmText = 'OK', String? cancelText, bool danger = false}) async {
    final context = _context;
    if (context == null) return false;
    return showConfirmDialog(context, title: title, message: message, confirmText: confirmText, cancelText: cancelText, danger: danger);
  }

  Future<void> notify({required String title, required String message, String confirmText = 'Tutup'}) async {
    await confirm(title: title, message: message, confirmText: confirmText);
  }

  Future<bool> confirmDelete(String title, String message) => confirm(title: title, message: message, confirmText: 'Ya, Hapus', cancelText: 'Batal', danger: true);

  /// Form generik. Mengembalikan true bila berhasil disimpan.
  Future<bool> form(FormSpec spec) async {
    final context = _context;
    if (context == null) return false;
    return showFormDialog(context, spec);
  }
}

/// Pemicu muat-ulang tunggal: tombol "Muat ulang" dan setiap simpan/hapus memakainya.
class ReloadService extends ChangeNotifier {
  int version = 0;

  void reload() {
    version += 1;
    notifyListeners();
  }
}
