import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/result.dart';
import '../models/models.dart';

class PlanInput {
  const PlanInput({required this.name, required this.priceMonth, required this.maxBranches, required this.maxUsers, required this.isActive, this.note});
  final String name;
  final num priceMonth;
  final int maxBranches;
  final int maxUsers;
  final bool isActive;
  final String? note;

  Map<String, dynamic> toJson() => {'name': name, 'price_month': priceMonth, 'max_branches': maxBranches, 'max_users': maxUsers, 'is_active': isActive, 'note': note};
}

class PlanRepository {
  PlanRepository(this._db);
  final SupabaseClient _db;

  Future<Result<List<Plan>>> list() => guard(() async {
        final rows = await _db.from('plans').select().order('code');
        return rows.map(Plan.fromJson).toList();
      });

  Future<Result<void>> create(String code, PlanInput input) => guard(() async {
        await _db.from('plans').insert({'code': code, ...input.toJson()});
      });

  Future<Result<void>> update(String code, PlanInput input) => guard(() async {
        await _db.from('plans').update(input.toJson()).eq('code', code);
      });

  Future<Result<void>> setActive(String code, bool isActive) => guard(() async {
        await _db.from('plans').update({'is_active': isActive}).eq('code', code);
      });

  Future<Result<void>> delete(String code) => guard(() async {
        await _db.from('plans').delete().eq('code', code);
      });
}
