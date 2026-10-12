import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/menu.dart';
import '../viewmodels/app_deps.dart';
import '../viewmodels/auth_view_model.dart';
import '../viewmodels/lookups_view_model.dart';
import '../views/app_shell.dart';
import '../views/login_view.dart';
import '../views/pages/cabang_page.dart';
import '../views/pages/klien_page.dart';
import '../views/pages/langganan_page.dart';
import '../views/pages/log_audit_page.dart';
import '../views/pages/log_teknis_page.dart';
import '../views/pages/paket_page.dart';
import '../views/pages/pemakaian_page.dart';
import '../views/pages/pengaturan_page.dart';
import '../views/pages/pengguna_page.dart';
import '../views/pages/retur_page.dart';
import '../views/pages/ringkasan_page.dart';
import '../views/pages/transaksi_page.dart';
import '../views/theme.dart';

class KlontonkApp extends StatefulWidget {
  const KlontonkApp({super.key, required this.deps});
  final AppDeps deps;

  @override
  State<KlontonkApp> createState() => _KlontonkAppState();
}

class _KlontonkAppState extends State<KlontonkApp> {
  late final GoRouter _router = _buildRouter();

  /// Pindah halaman dengan parameter URL (parameter kosong dipertahankan, lihat [Go]).
  void _go(String path, [Map<String, String> params = const {}]) {
    _router.go(Uri(path: path, queryParameters: params.isEmpty ? null : params).toString());
  }

  GoRouter _buildRouter() {
    final auth = widget.deps.auth;

    Page<void> halaman(GoRouterState state, Widget child) => NoTransitionPage<void>(key: ValueKey(state.uri.toString()), child: child);

    return GoRouter(
      navigatorKey: widget.deps.dialog.navigatorKey,
      initialLocation: defaultPath,
      refreshListenable: auth,
      redirect: (context, state) {
        final path = state.uri.path;
        final masuk = auth.status == AuthStatus.authenticated;
        if (!masuk) return path == '/login' ? null : '/login';
        if (path == '/login' || path == '/') return defaultPath;
        return null;
      },
      errorBuilder: (context, state) => Scaffold(
        body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('Halaman tidak ditemukan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            FilledButton(onPressed: () => context.go(defaultPath), child: const Text('Ke Ringkasan')),
          ]),
        ),
      ),
      routes: [
        GoRoute(path: '/login', builder: (context, state) => const LoginView()),
        ShellRoute(
          builder: (context, state, child) => AppShell(location: state.uri.path, child: child),
          routes: [
            GoRoute(path: '/ringkasan', pageBuilder: (c, s) => halaman(s, RingkasanPage(go: _go))),
            GoRoute(path: '/pemakaian', pageBuilder: (c, s) => halaman(s, PemakaianPage(params: s.uri.queryParameters, go: _go))),
            GoRoute(path: '/klien', pageBuilder: (c, s) => halaman(s, KlienPage(params: s.uri.queryParameters, go: _go))),
            GoRoute(path: '/cabang', pageBuilder: (c, s) => halaman(s, CabangPage(params: s.uri.queryParameters, go: _go))),
            GoRoute(path: '/langganan', pageBuilder: (c, s) => halaman(s, LanggananPage(params: s.uri.queryParameters, go: _go))),
            GoRoute(path: '/paket', pageBuilder: (c, s) => halaman(s, const PaketPage())),
            GoRoute(path: '/pengguna', pageBuilder: (c, s) => halaman(s, PenggunaPage(params: s.uri.queryParameters, go: _go))),
            GoRoute(path: '/transaksi', pageBuilder: (c, s) => halaman(s, TransaksiPage(params: s.uri.queryParameters, go: _go))),
            GoRoute(path: '/retur', pageBuilder: (c, s) => halaman(s, ReturPage(params: s.uri.queryParameters, go: _go))),
            GoRoute(path: '/log-audit', pageBuilder: (c, s) => halaman(s, LogAuditPage(params: s.uri.queryParameters, go: _go))),
            GoRoute(path: '/log-teknis', pageBuilder: (c, s) => halaman(s, LogTeknisPage(params: s.uri.queryParameters, go: _go))),
            GoRoute(path: '/pengaturan', pageBuilder: (c, s) => halaman(s, const PengaturanPage())),
          ],
        ),
      ],
    );
  }

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final deps = widget.deps;
    return MultiProvider(
      providers: [
        Provider<AppDeps>.value(value: deps),
        ChangeNotifierProvider<AuthViewModel>.value(value: deps.auth),
        ChangeNotifierProvider<LookupsViewModel>.value(value: deps.lookups),
      ],
      child: MaterialApp.router(
        title: 'Klontonk Dashboard',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        routerConfig: _router,
        scaffoldMessengerKey: deps.toast.messengerKey,
      ),
    );
  }
}
