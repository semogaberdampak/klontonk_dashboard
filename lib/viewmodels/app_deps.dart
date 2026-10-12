import '../data/repositories/auth_repository.dart';
import '../data/repositories/client_repository.dart';
import '../data/repositories/log_repository.dart';
import '../data/repositories/lookup_repository.dart';
import '../data/repositories/overview_repository.dart';
import '../data/repositories/plan_repository.dart';
import '../data/repositories/profile_repository.dart';
import '../data/repositories/sales_repository.dart';
import '../data/repositories/subscription_repository.dart';
import '../data/repositories/system_repository.dart';
import '../data/repositories/tenant_repository.dart';
import '../services/services.dart';
import 'auth_view_model.dart';
import 'lookups_view_model.dart';

/// Kontainer dependensi: repository (Model) dan layanan bersama yang dipakai ViewModel.
/// Dibuat sekali di main() dan dibagikan lewat Provider.
class AppDeps {
  AppDeps({
    required this.auth,
    required this.lookups,
    required this.toast,
    required this.dialog,
    required this.reload,
    required this.authRepo,
    required this.overview,
    required this.clients,
    required this.tenants,
    required this.plans,
    required this.subscriptions,
    required this.profiles,
    required this.logs,
    required this.sales,
    required this.system,
    required this.lookupRepo,
  });

  final AuthViewModel auth;
  final LookupsViewModel lookups;
  final ToastService toast;
  final DialogService dialog;
  final ReloadService reload;

  final AuthRepository authRepo;
  final OverviewRepository overview;
  final ClientRepository clients;
  final TenantRepository tenants;
  final PlanRepository plans;
  final SubscriptionRepository subscriptions;
  final ProfileRepository profiles;
  final LogRepository logs;
  final SalesRepository sales;
  final SystemRepository system;
  final LookupRepository lookupRepo;
}

/// Pindah halaman dengan parameter URL. Parameter bernilai kosong SENGAJA dipertahankan:
/// halaman berfilter tanggal membedakan "tidak ada ?dari=" (pakai tanggal bawaan) dari
/// "?dari=" kosong (tanpa batas tanggal).
typedef Go = void Function(String path, [Map<String, String> params]);
