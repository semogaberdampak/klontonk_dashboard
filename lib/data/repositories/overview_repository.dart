import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/result.dart';
import '../models/models.dart';

class ClientFilters {
  const ClientFilters({this.cari = '', this.status = '', this.offset = 0});
  final String cari;
  final String status;
  final int offset;
}

/// View v_client_overview: angka agregat per client dihitung DATABASE, bukan di aplikasi.
class OverviewRepository {
  OverviewRepository(this._db);
  final SupabaseClient _db;

  static const _view = 'v_client_overview';

  Future<Result<List<ClientOverview>>> list() => guard(() async {
        final rows = await _db.from(_view).select().order('name');
        return rows.map(ClientOverview.fromJson).toList();
      });

  Future<Result<List<ClientOverview>>> planUsage() => guard(() async {
        final rows = await _db.from(_view).select('id,name,plan_code');
        return rows.map(ClientOverview.fromJson).toList();
      });

  Future<Result<PageResult<ClientOverview>>> page(ClientFilters f, int limit) => guard(() async {
        var query = _db.from(_view).select('*');
        if (f.cari.isNotEmpty) query = query.ilike('name', '%${f.cari}%');
        if (f.status.isNotEmpty) query = query.eq('status', f.status);
        final res = await query.order('name').range(f.offset, f.offset + limit - 1).count(CountOption.exact);
        return PageResult(rows: res.data.map(ClientOverview.fromJson).toList(), total: res.count);
      });

  Future<Result<List<ClientOverview>>> subscriptionSummary() => guard(() async {
        final rows = await _db.from(_view).select('id,name,plan_code,plan_name,price_month,sub_status,days_left,expires_at').order('name');
        return rows.map(ClientOverview.fromJson).toList();
      });
}
