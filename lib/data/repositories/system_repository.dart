import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/result.dart';
import '../models/models.dart';

class SystemRepository {
  SystemRepository(this._db);
  final SupabaseClient _db;

  Future<int?> _count(String table) async {
    try {
      return await _db.from(table).count(CountOption.exact);
    } catch (_) {
      return null;
    }
  }

  Future<SystemCounts> counts() async {
    final hasil = await Future.wait([_count('clients'), _count('tenants'), _count('profiles'), _count('audit_logs'), _count('client_events')]);
    return SystemCounts(klien: hasil[0], cabang: hasil[1], pengguna: hasil[2], logAudit: hasil[3], logTeknis: hasil[4]);
  }

  Future<Result<PurgeSummary>> purgeOldLogs(int auditDays, int eventDays) => guard(() async {
        final data = await _db.rpc('purge_old_logs', params: {'p_audit_days': auditDays, 'p_event_days': eventDays});
        return PurgeSummary.fromJson(data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{});
      });
}
