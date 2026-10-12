import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/result.dart';
import '../models/models.dart';

class SalesFilters {
  const SalesFilters({this.tenantIds, this.dariIso = '', this.sampaiIso = '', this.metode = '', this.cari = '', this.offset = 0});
  final List<String>? tenantIds;
  final String dariIso;
  final String sampaiIso;
  final String metode;
  final String cari;
  final int offset;
}

class ReturnFilters {
  const ReturnFilters({this.tenantIds, this.dariIso = '', this.sampaiIso = '', this.jenis = '', this.alasan = '', this.cari = '', this.offset = 0});
  final List<String>? tenantIds;
  final String dariIso;
  final String sampaiIso;
  final String jenis;
  final String alasan;
  final String cari;
  final int offset;
}

/// Data transaksi dan retur milik client: HANYA BACA dari dashboard.
class SalesRepository {
  SalesRepository(this._db);
  final SupabaseClient _db;

  Future<Result<PageResult<Sale>>> pageSales(SalesFilters f, int limit) => guard(() async {
        var query = _db.from('sales').select('tenant_id,no,at,cashier,method,total,paid,tenant:tenants(name,client_id)');
        if (f.tenantIds != null) query = query.inFilter('tenant_id', f.tenantIds!);
        if (f.dariIso.isNotEmpty) query = query.gte('at', f.dariIso);
        if (f.sampaiIso.isNotEmpty) query = query.lte('at', f.sampaiIso);
        if (f.metode.isNotEmpty) query = query.eq('method', f.metode);
        if (f.cari.isNotEmpty) query = query.or('no.ilike.*${f.cari}*,cashier.ilike.*${f.cari}*');
        final res = await query.order('at', ascending: false).range(f.offset, f.offset + limit - 1).count(CountOption.exact);
        return PageResult(rows: res.data.map(Sale.fromJson).toList(), total: res.count);
      });

  Future<Result<PageResult<StockReturn>>> pageReturns(ReturnFilters f, int limit) => guard(() async {
        var query = _db.from('stock_returns').select('tenant_id,no,at,cashier,kind,item_id,name,unit,qty,amount,reason,note,tenant:tenants(name,client_id)');
        if (f.tenantIds != null) query = query.inFilter('tenant_id', f.tenantIds!);
        if (f.dariIso.isNotEmpty) query = query.gte('at', f.dariIso);
        if (f.sampaiIso.isNotEmpty) query = query.lte('at', f.sampaiIso);
        if (f.jenis.isNotEmpty) query = query.eq('kind', f.jenis);
        if (f.alasan.isNotEmpty) query = query.eq('reason', f.alasan);
        if (f.cari.isNotEmpty) query = query.or('no.ilike.*${f.cari}*,name.ilike.*${f.cari}*,cashier.ilike.*${f.cari}*');
        final res = await query.order('at', ascending: false).range(f.offset, f.offset + limit - 1).count(CountOption.exact);
        return PageResult(rows: res.data.map(StockReturn.fromJson).toList(), total: res.count);
      });

  /// Aktivitas harian satu client. Dihitung DATABASE lewat RPC usage_daily().
  Future<Result<List<UsageDay>>> dailyUsage(String clientId, String from, String to) => guard(() async {
        final rows = await _db.rpc('usage_daily', params: {'p_client': clientId, 'p_from': from, 'p_to': to}) as List<dynamic>;
        return rows.map((r) => UsageDay.fromJson(Map<String, dynamic>.from(r as Map))).toList();
      });
}
