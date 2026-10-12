import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/result.dart';
import '../models/models.dart';

class SubscriptionFilters {
  const SubscriptionFilters({this.client = '', this.status = '', this.offset = 0});
  final String client;
  final String status;
  final int offset;
}

class SubscriptionRepository {
  SubscriptionRepository(this._db);
  final SupabaseClient _db;

  static const _columns = 'id,client_id,plan_code,started_at,expires_at,status,note,client:clients(name,status),plan:plans(name,price_month)';

  Future<Result<PageResult<Subscription>>> page(SubscriptionFilters f, int limit) => guard(() async {
        var query = _db.from('subscriptions').select(_columns);
        if (f.client.isNotEmpty) query = query.eq('client_id', f.client);
        if (f.status.isNotEmpty) query = query.eq('status', f.status);
        final res = await query.order('expires_at', ascending: false).range(f.offset, f.offset + limit - 1).count(CountOption.exact);
        return PageResult(rows: res.data.map(Subscription.fromJson).toList(), total: res.count);
      });

  Future<Result<void>> create({required String clientId, required String planCode, required String startedAt, required String expiresAt, required String status, String? note}) => guard(() async {
        await _db.from('subscriptions').insert({'client_id': clientId, 'plan_code': planCode, 'started_at': startedAt, 'expires_at': expiresAt, 'status': status, 'note': note});
      });

  Future<Result<void>> update(Object id, {required String planCode, required String status, required String expiresAt, String? note}) => guard(() async {
        await _db.from('subscriptions').update({'plan_code': planCode, 'status': status, 'expires_at': expiresAt, 'note': note}).eq('id', id);
      });

  Future<Result<void>> extend(Object id, String expiresAt) => guard(() async {
        await _db.from('subscriptions').update({'expires_at': expiresAt, 'status': 'aktif'}).eq('id', id);
      });

  /// Tandai langganan trial/aktif yang sudah lewat masa berlakunya sebagai jatuh tempo. Hasil: jumlah baris.
  Future<Result<int>> markExpired(String today) => guard(() async {
        final rows = await _db.from('subscriptions').update({'status': 'jatuh_tempo'}).lt('expires_at', today).inFilter('status', ['trial', 'aktif']).select('id');
        return rows.length;
      });

  Future<Result<void>> delete(Object id) => guard(() async {
        await _db.from('subscriptions').delete().eq('id', id);
      });
}
