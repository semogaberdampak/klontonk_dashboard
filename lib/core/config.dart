/// Konstanta aplikasi. Nilai per-lingkungan dibaca dari `--dart-define` saat build:
///   --dart-define=SUPABASE_URL=...  --dart-define=SUPABASE_KEY=...  --dart-define=DEMO_MODE=true
///
/// Kunci publishable PUBLIK dan memang untuk dipasang di aplikasi klien: keamanan data dijaga
/// oleh RLS di database (db/dashboard-schema.sql), bukan kerahasiaan kunci. JANGAN pernah mengisi
/// kunci "secret" / "service_role".
class AppConfig {
  const AppConfig._();

  static const appVersion = '3.0.0';
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL', defaultValue: 'https://bxynoilzdiqjiepdewnp.supabase.co');
  static const supabaseKey = String.fromEnvironment('SUPABASE_KEY', defaultValue: 'sb_publishable_biqV-ZAK0T0B43KKyoQgSw_VOjb-GhC');

  /// Mode demo: data contoh tanpa Supabase dan tanpa login.
  static const demoMode = bool.fromEnvironment('DEMO_MODE');

  /// Jumlah baris per halaman tabel (ditampilkan di halaman Pengaturan).
  static const pageSize = 50;

  /// Domain email internal. Supabase Auth memerlukan email, sedangkan kasir login memakai username:
  /// akun client dibuat dengan email <username>@klontonk.local. HARUS sama dengan EMAIL_DOMAIN di
  /// klontonk_pos/js/config.js, kalau berbeda akun yang dibuat di sini tidak bisa login di POS.
  static const emailDomain = 'klontonk.local';

  static const requestTimeout = Duration(seconds: 25);
}
