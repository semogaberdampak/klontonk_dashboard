import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/result.dart';
import '../models/models.dart';

class ProfileFilters {
  const ProfileFilters({this.tenantIds, this.cari = '', this.offset = 0});

  /// null = semua cabang; daftar kosong = client belum punya cabang (hasil kosong).
  final List<String>? tenantIds;
  final String cari;
  final int offset;
}

class ProfileRepository {
  ProfileRepository(this._db);
  final SupabaseClient _db;

  Future<Result<PageResult<Profile>>> page(ProfileFilters f, int limit) => guard(() async {
        var query = _db.from('profiles').select('id,username,name,role,avatar,tenant_id,created_at');
        if (f.tenantIds != null) query = query.inFilter('tenant_id', f.tenantIds!);
        if (f.cari.isNotEmpty) query = query.or('username.ilike.*${f.cari}*,name.ilike.*${f.cari}*');
        final res = await query.order('created_at', ascending: false).range(f.offset, f.offset + limit - 1).count(CountOption.exact);
        return PageResult(rows: res.data.map(Profile.fromJson).toList(), total: res.count);
      });

  Future<Result<bool>> isUsernameTaken(String username) => guard(() async {
        final rows = await _db.from('profiles').select('id').eq('username', username).limit(1);
        return rows.isNotEmpty;
      });

  Future<Result<void>> create({required String id, required String username, required String name, required String role, required String avatar, required String tenantId}) => guard(() async {
        await _db.from('profiles').insert({'id': id, 'username': username, 'name': name, 'role': role, 'avatar': avatar, 'tenant_id': tenantId});
      });

  Future<Result<void>> update(String id, {required String name, required String role, required String tenantId}) => guard(() async {
        await _db.from('profiles').update({'name': name, 'role': role, 'tenant_id': tenantId}).eq('id', id);
      });

  Future<Result<void>> deleteByUsername(String username) => guard(() async {
        await _db.rpc('platform_delete_user', params: {'p_username': username});
      });
}
