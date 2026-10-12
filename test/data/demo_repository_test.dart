import 'package:flutter_test/flutter_test.dart';
import 'package:klontonk_dashboard/core/result.dart';
import 'package:klontonk_dashboard/data/demo/demo_http_client.dart';
import 'package:klontonk_dashboard/data/models/models.dart';
import 'package:klontonk_dashboard/data/repositories/overview_repository.dart';
import 'package:klontonk_dashboard/data/repositories/plan_repository.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Repository diuji terhadap PostgREST palsu (mode demo): memastikan query, header count,
/// dan pemetaan model bekerja tanpa jaringan.
void main() {
  final db = SupabaseClient('https://demo.supabase.co', 'demo-key', httpClient: DemoHttpClient());

  test('OverviewRepository.list memetakan semua client demo', () async {
    final r = await OverviewRepository(db).list();
    expect(r, isA<Ok<List<ClientOverview>>>());
    expect((r as Ok<List<ClientOverview>>).data.length, 3);
  });

  test('OverviewRepository.page memfilter status dan menghitung total', () async {
    final r = await OverviewRepository(db).page(const ClientFilters(status: 'suspend'), 25);
    final page = (r as Ok<PageResult<ClientOverview>>).data;
    expect(page.total, page.rows.length);
    expect(page.rows.every((c) => c.status == 'suspend'), isTrue);
  });

  test('PlanRepository.list mengembalikan paket', () async {
    final r = await PlanRepository(db).list();
    expect((r as Ok<List<Plan>>).data, isNotEmpty);
  });
}
