import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/config.dart';
import '../core/result.dart';
import '../data/models/models.dart';
import '../data/repositories/auth_repository.dart';
import '../services/services.dart';

enum AuthStatus { loading, anonymous, authenticated }

sealed class LoginResult {
  const LoginResult();
}

final class LoginOk extends LoginResult {
  const LoginOk(this.admin);
  final PlatformAdmin admin;
}

final class LoginFail extends LoginResult {
  const LoginFail(this.error);
  final String error;
}

/// Login dashboard memakai EMAIL + PASSWORD -- berbeda dari klontonk_pos yang memakai username
/// (username dipetakan ke <username>@klontonk.local). Pemisahan ini disengaja: akun platform
/// tidak bisa dipakai login ke aplikasi POS client, dan sebaliknya.
class AuthViewModel extends ChangeNotifier {
  AuthViewModel(this._repo, this._toast);

  final AuthRepository _repo;
  final ToastService _toast;

  AuthStatus status = AuthStatus.loading;
  PlatformAdmin? admin;

  StreamSubscription<AuthChangeEvent>? _subscription;
  bool _expiring = false;

  void _set(AuthStatus next, [PlatformAdmin? nextAdmin]) {
    status = next;
    admin = nextAdmin;
    notifyListeners();
  }

  Future<void> _clear() async {
    await _repo.writeCachedAdmin(null);
    _set(AuthStatus.anonymous);
    await _repo.signOut();
  }

  /// Pulihkan sesi login saat aplikasi dibuka. Dipanggil sekali sebelum routing dimulai.
  Future<void> boot() async {
    final demo = _repo.demoAdmin;
    if (demo != null) return _set(AuthStatus.authenticated, demo);

    // Sesi dibuang supabase (refresh token ditolak, logout di tab lain) -> kembali ke login.
    _subscription ??= _repo.events.listen((event) {
      if (event == AuthChangeEvent.signedOut && status == AuthStatus.authenticated) {
        _repo.writeCachedAdmin(null);
        _set(AuthStatus.anonymous);
      }
    });

    final cached = await _repo.readCachedAdmin();
    final uid = _repo.currentUserId;
    if (uid == null) return _clear();

    final check = await _repo.fetchAdmin(uid);
    switch (check) {
      case Ok(:final data):
        if (data == null) return _clear(); // bukan admin platform
        final restored = PlatformAdmin(id: data.id, name: data.name, email: cached?.id == uid ? cached?.email : null);
        await _repo.writeCachedAdmin(restored);
        return _set(AuthStatus.authenticated, restored);
      case Err(:final error):
        // Offline: pakai salinan tersimpan asal masih milik pengguna yang sama (data tetap dijaga RLS).
        if (error.status == 0 && cached != null && cached.id == uid) return _set(AuthStatus.authenticated, cached);
        return _clear();
    }
  }

  /// Pesan error selalu generik untuk mencegah penebakan akun (user enumeration).
  Future<LoginResult> login(String email, String password) async {
    final mail = email.trim().toLowerCase();
    if (mail.isEmpty || password.isEmpty) return const LoginFail('Email dan password wajib diisi.');

    final signedIn = await _repo.signIn(mail, password);
    if (signedIn case Err(:final error)) {
      if (error.status == 0) return LoginFail(error.message);
      if (error.status == 429) return const LoginFail('Terlalu banyak percobaan. Coba lagi beberapa saat.');
      if (error.status >= 500) return const LoginFail('Layanan sedang bermasalah. Coba lagi sebentar.');
      return const LoginFail('Email atau password salah.');
    }
    final uid = (signedIn as Ok<String>).data;

    final check = await _repo.fetchAdmin(uid);
    if (check case Err(:final error)) {
      await _clear();
      return LoginFail(error.message);
    }
    final row = (check as Ok<PlatformAdmin?>).data;
    if (row == null) {
      await _clear();
      return const LoginFail('Akun ini bukan admin platform. Hubungi pemilik sistem.');
    }

    final loggedIn = PlatformAdmin(id: row.id, name: row.name, email: mail);
    await _repo.writeCachedAdmin(loggedIn);
    _expiring = false;
    _set(AuthStatus.authenticated, loggedIn);
    return LoginOk(loggedIn);
  }

  Future<void> logout() async {
    if (AppConfig.demoMode) return;
    await _clear();
  }

  /// Dipakai saat server menjawab 401: sesi tidak berlaku lagi.
  void expire() {
    if (_expiring || AppConfig.demoMode) return;
    _expiring = true;
    _toast.show('Sesi berakhir. Silakan login ulang.', type: ToastType.warning);
    _clear();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
