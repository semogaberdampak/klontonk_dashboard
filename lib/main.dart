import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/app.dart';
import 'core/config.dart';
import 'data/demo/demo_http_client.dart';
import 'data/repositories/auth_repository.dart';
import 'data/repositories/client_repository.dart';
import 'data/repositories/log_repository.dart';
import 'data/repositories/lookup_repository.dart';
import 'data/repositories/overview_repository.dart';
import 'data/repositories/plan_repository.dart';
import 'data/repositories/profile_repository.dart';
import 'data/repositories/sales_repository.dart';
import 'data/repositories/subscription_repository.dart';
import 'data/repositories/system_repository.dart';
import 'data/repositories/tenant_repository.dart';
import 'services/services.dart';
import 'viewmodels/app_deps.dart';
import 'viewmodels/auth_view_model.dart';
import 'viewmodels/lookups_view_model.dart';

/// Titik masuk dan "composition root": semua repository, layanan, dan ViewModel global dirakit di sini.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    publishableKey: AppConfig.supabaseKey,
    httpClient: AppConfig.demoMode ? DemoHttpClient() : null,
  );
  final db = Supabase.instance.client;

  // Klien tanpa sesi: membuat akun client tanpa menimpa sesi admin yang sedang aktif.
  SupabaseClient detached() => SupabaseClient(
        AppConfig.supabaseUrl,
        AppConfig.supabaseKey,
        httpClient: AppConfig.demoMode ? DemoHttpClient() : null,
        authOptions: const AuthClientOptions(autoRefreshToken: false),
      );

  final toast = ToastService();
  final authRepo = AuthRepository(db, detached);
  final lookupRepo = LookupRepository(db);
  final auth = AuthViewModel(authRepo, toast);
  final lookups = LookupsViewModel(lookupRepo, toast)..auth = auth;

  final deps = AppDeps(
    auth: auth,
    lookups: lookups,
    toast: toast,
    dialog: DialogService(),
    reload: ReloadService(),
    authRepo: authRepo,
    overview: OverviewRepository(db),
    clients: ClientRepository(db),
    tenants: TenantRepository(db),
    plans: PlanRepository(db),
    subscriptions: SubscriptionRepository(db),
    profiles: ProfileRepository(db),
    logs: LogRepository(db),
    sales: SalesRepository(db),
    system: SystemRepository(db),
    lookupRepo: lookupRepo,
  );

  await auth.boot();
  runApp(KlontonkApp(deps: deps));
}
