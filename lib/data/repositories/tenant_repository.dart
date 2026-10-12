import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/result.dart';
import '../models/models.dart';

class TenantFilters {
  const TenantFilters({this.client = '', this.cari = '', this.offset = 0});
  final String client;
  final String cari;
  final int offset;
}

class TenantRepository {
  TenantRepository(this._db);
  final SupabaseClient _db;

  Future<Result<PageResult<Tenant>>> page(TenantFilters f, int limit) => guard(() async {
        var query = _db.from('tenants').select('id,name,client_id');
        if (f.client.isNotEmpty) query = query.eq('client_id', f.client);
        if (f.cari.isNotEmpty) query = query.ilike('name', '%${f.cari}%');
        final res = await query.order('id').range(f.offset, f.offset + limit - 1).count(CountOption.exact);
        return PageResult(rows: res.data.map(Tenant.fromJson).toList(), total: res.count);
      });

  /// Jumlah pengguna tiap cabang yang sedang tampil -- satu query, bukan per cabang.
  Future<Map<String, int>> countUsers(List<String> tenantIds) async {
    if (tenantIds.isEmpty) return {};
    try {
      final rows = await _db.from('profiles').select('tenant_id').inFilter('tenant_id', tenantIds);
      final peta = <String, int>{};
      for (final row in rows) {
        final id = row['tenant_id'] as String;
        peta[id] = (peta[id] ?? 0) + 1;
      }
      return peta;
    } catch (_) {
      return {};
    }
  }

  /// ID cabang (T00x) dibuat otomatis oleh database.
  Future<Result<Tenant>> create(String clientId, String name) => guard(() async {
        final row = await _db.from('tenants').insert({'client_id': clientId, 'name': name}).select('id,name,client_id').single();
        return Tenant.fromJson(row);
      });

  Future<Result<void>> rename(String id, String name) => guard(() async {
        await _db.from('tenants').update({'name': name}).eq('id', id);
      });

  Future<Result<void>> delete(String id) => guard(() async {
        await _db.from('tenants').delete().eq('id', id);
      });
}
