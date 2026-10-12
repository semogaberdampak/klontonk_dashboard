import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config.dart';
import '../../core/result.dart';
import '../models/models.dart';

/// Keputusan akses sesungguhnya ada di database: RLS + tabel platform_admins
/// (db/dashboard-schema.sql). Pengecekan di sini hanya untuk tampilan.
class AuthRepository {
  AuthRepository(this._db, this._detached);

  final SupabaseClient _db;

  /// Klien tanpa sesi: membuat akun client baru TANPA menimpa sesi admin yang sedang aktif.
  final SupabaseClient Function() _detached;

  static const _adminKey = 'klontonk:dash-admin';

  String? get currentUserId => _db.auth.currentUser?.id;

  Future<Result<PlatformAdmin?>> fetchAdmin(String uid) => guard(() async {
        final row = await _db.from('platform_admins').select('id,name').eq('id', uid).maybeSingle();
        return row == null ? null : PlatformAdmin(id: row['id'] as String, name: row['name'] as String);
      });

  Future<Result<String>> signIn(String email, String password) => guard(() async {
        final res = await _db.auth.signInWithPassword(email: email, password: password);
        final user = res.user;
        if (user == null) throw const AuthException('Login gagal. Coba lagi.', statusCode: '500');
        return user.id;
      });

  Future<void> signOut() async {
    try {
      await _db.auth.signOut(scope: SignOutScope.local);
    } catch (_) {
      // Offline: sesi lokal tetap dibuang.
    }
  }

  Future<Result<String>> signUpDetached(String email, String password) => guard(() async {
        final res = await _detached().auth.signUp(email: email, password: password);
        final user = res.user;
        if (user == null) throw const AuthException('Akun gagal dibuat. Coba lagi.', statusCode: '500');
        return user.id;
      });

  /// Subscribe perubahan sesi; dipakai untuk kembali ke login saat sesi dibuang.
  Stream<AuthChangeEvent> get events => _db.auth.onAuthStateChange.map((state) => state.event);

  /// Salinan admin untuk tampilan saat offline.
  Future<PlatformAdmin?> readCachedAdmin() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final id = prefs.getString('$_adminKey:id');
      final name = prefs.getString('$_adminKey:name');
      if (id == null || name == null) return null;
      return PlatformAdmin(id: id, name: name, email: prefs.getString('$_adminKey:email'));
    } catch (_) {
      return null;
    }
  }

  Future<void> writeCachedAdmin(PlatformAdmin? admin) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (admin == null) {
        await prefs.remove('$_adminKey:id');
        await prefs.remove('$_adminKey:name');
        await prefs.remove('$_adminKey:email');
        return;
      }
      await prefs.setString('$_adminKey:id', admin.id);
      await prefs.setString('$_adminKey:name', admin.name);
      if (admin.email != null) await prefs.setString('$_adminKey:email', admin.email!);
    } catch (_) {
      // diabaikan
    }
  }

  /// Dalam mode demo tidak ada Supabase Auth: admin demo langsung dipakai.
  PlatformAdmin? get demoAdmin => AppConfig.demoMode ? const PlatformAdmin(id: 'demo-admin', name: 'Admin Demo') : null;
}
