import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/result.dart';

class NewClient {
  const NewClient({required this.name, required this.planCode, this.contactName, this.contactPhone, this.contactEmail, required this.trialDays, this.note});
  final String name;
  final String planCode;
  final String? contactName;
  final String? contactPhone;
  final String? contactEmail;
  final int trialDays;
  final String? note;
}

class ClientRepository {
  ClientRepository(this._db);
  final SupabaseClient _db;

  /// Client + langganan trial dibuat dalam satu transaksi database (tidak mungkin setengah jadi).
  Future<Result<void>> createWithPlan(NewClient c) => guard(() async {
        await _db.rpc('create_client_with_plan', params: {
          'p_name': c.name,
          'p_plan_code': c.planCode,
          'p_contact_name': c.contactName,
          'p_contact_phone': c.contactPhone,
          'p_contact_email': c.contactEmail,
          'p_trial_days': c.trialDays,
          'p_note': c.note,
        });
      });

  Future<Result<void>> update(String id, Map<String, dynamic> patch) => guard(() async {
        await _db.from('clients').update(patch).eq('id', id);
      });

  Future<Result<void>> setStatus(String id, String status) => update(id, {'status': status});
}
