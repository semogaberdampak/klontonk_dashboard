import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/result.dart';
import '../models/models.dart';

class LookupsData {
  const LookupsData({this.clients = const [], this.plans = const [], this.tenants = const []});
  final List<ClientRef> clients;
  final List<Plan> plans;
  final List<Tenant> tenants;
}

/// Daftar acuan untuk dropdown dan filter. RLS tetap berlaku: client hanya melihat miliknya.
class LookupRepository {
  LookupRepository(this._db);
  final SupabaseClient _db;

  static const _chunk = 500;

  Future<List<Map<String, dynamic>>> _fetchAll(String table, String columns, String orderBy) async {
    final rows = <Map<String, dynamic>>[];
    for (var from = 0;; from += _chunk) {
      final chunk = await _db.from(table).select(columns).order(orderBy).range(from, from + _chunk - 1);
      rows.addAll(chunk);
      if (chunk.length < _chunk) return rows;
    }
  }

  Future<Result<LookupsData>> load() => guard(() async {
        final hasil = await Future.wait([
          _fetchAll('clients', 'id,name,status', 'id'),
          _fetchAll('plans', 'code,name,price_month,max_branches,max_users,is_active,note', 'code'),
          _fetchAll('tenants', 'id,name,client_id', 'id'),
        ]);
        return LookupsData(
          clients: hasil[0].map(ClientRef.fromJson).toList(),
          plans: hasil[1].map(Plan.fromJson).toList(),
          tenants: hasil[2].map(Tenant.fromJson).toList(),
        );
      });
}
