import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/result.dart';
import '../models/models.dart';

class AuditFilters {
  const AuditFilters({this.tenantIds, this.aksi = '', this.pelaku = '', this.dariIso = '', this.sampaiIso = '', this.offset = 0});
  final List<String>? tenantIds;
  final String aksi;
  final String pelaku;
  final String dariIso;
  final String sampaiIso;
  final int offset;
}

class EventFilters {
  const EventFilters({this.level = '', this.tenantIds, this.clientId = '', this.cari = '', this.dariIso = '', this.sampaiIso = '', this.offset = 0});
  final String level;
  final List<String>? tenantIds;
  final String clientId;
  final String cari;
  final String dariIso;
  final String sampaiIso;
  final int offset;
}

/// Log audit (dicatat otomatis oleh trigger database) dan log teknis (dikirim aplikasi POS).
class LogRepository {
  LogRepository(this._db);
  final SupabaseClient _db;

  static const _auditColumns = 'at,actor_name,actor_role,action,entity,entity_id,client_id,tenant_id,detail';
  static const _eventColumns = 'at,level,source,message,context,app_version,device,client_id,tenant_id';

  Future<Result<PageResult<AuditLog>>> pageAudit(AuditFilters f, int limit) => guard(() async {
        var query = _db.from('audit_logs').select(_auditColumns);
        if (f.tenantIds != null) query = query.inFilter('tenant_id', f.tenantIds!);
        if (f.aksi.isNotEmpty) query = query.eq('action', f.aksi);
        if (f.pelaku.isNotEmpty) query = query.ilike('actor_name', '%${f.pelaku}%');
        if (f.dariIso.isNotEmpty) query = query.gte('at', f.dariIso);
        if (f.sampaiIso.isNotEmpty) query = query.lte('at', f.sampaiIso);
        final res = await query.order('at', ascending: false).range(f.offset, f.offset + limit - 1).count(CountOption.exact);
        return PageResult(rows: res.data.map(AuditLog.fromJson).toList(), total: res.count);
      });

  Future<Result<List<AuditLog>>> recentAudit(int limit) => guard(() async {
        final rows = await _db.from('audit_logs').select(_auditColumns).order('at', ascending: false).limit(limit);
        return rows.map(AuditLog.fromJson).toList();
      });

  Future<Result<PageResult<ClientEvent>>> pageEvents(EventFilters f, int limit) => guard(() async {
        var query = _db.from('client_events').select(_eventColumns);
        if (f.level.isNotEmpty) query = query.eq('level', f.level);
        if (f.tenantIds != null) query = query.inFilter('tenant_id', f.tenantIds!);
        if (f.clientId.isNotEmpty) query = query.eq('client_id', f.clientId);
        if (f.dariIso.isNotEmpty) query = query.gte('at', f.dariIso);
        if (f.sampaiIso.isNotEmpty) query = query.lte('at', f.sampaiIso);
        if (f.cari.isNotEmpty) query = query.ilike('message', '%${f.cari}%');
        final res = await query.order('at', ascending: false).range(f.offset, f.offset + limit - 1).count(CountOption.exact);
        return PageResult(rows: res.data.map(ClientEvent.fromJson).toList(), total: res.count);
      });

  /// Hitung baris per level (ikut filter client dan batas akhir, bukan filter lain). null bila gagal.
  Future<int?> countEvents(String level, String clientId, String sampaiIso) async {
    try {
      var query = _db.from('client_events').select('id').eq('level', level);
      if (clientId.isNotEmpty) query = query.eq('client_id', clientId);
      if (sampaiIso.isNotEmpty) query = query.lte('at', sampaiIso);
      final res = await query.limit(1).count(CountOption.exact);
      return res.count;
    } catch (_) {
      return null;
    }
  }

  Future<Result<List<ClientEvent>>> recentErrors(int limit) => guard(() async {
        final rows = await _db.from('client_events').select('at,level,source,message,tenant_id,client_id,app_version').eq('level', 'error').order('at', ascending: false).limit(limit);
        return rows.map(ClientEvent.fromJson).toList();
      });
}
