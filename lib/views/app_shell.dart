import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/config.dart';
import '../core/format.dart';
import '../core/menu.dart';
import '../viewmodels/app_deps.dart';
import '../viewmodels/auth_view_model.dart';
import 'theme.dart';

const _breakpoint = 900.0;

/// Kerangka halaman: sidebar (drawer di layar sempit), bilah atas, dan isi halaman.
class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.location, required this.child});
  final String location;
  final Widget child;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  @override
  void initState() {
    super.initState();
    final deps = context.read<AppDeps>();
    if (!deps.lookups.ready) deps.lookups.refresh();
  }

  @override
  Widget build(BuildContext context) {
    final lebar = MediaQuery.sizeOf(context).width >= _breakpoint;
    final route = routeFor(widget.location);
    final sidebar = _Sidebar(location: widget.location, onNavigate: (path) {
      if (!lebar) Navigator.of(context).maybePop();
      context.go(path);
    });

    return Scaffold(
      drawer: lebar ? null : Drawer(backgroundColor: AppColors.sidebar, child: sidebar),
      body: Row(children: [
        if (lebar) SizedBox(width: 244, child: sidebar),
        Expanded(
          child: Column(children: [
            _Topbar(title: route?.title ?? 'Halaman tidak ditemukan', subtitle: route?.subtitle ?? '', showMenu: !lebar),
            const _LookupBanner(),
            Expanded(child: widget.child),
          ]),
        ),
      ]),
    );
  }
}

class _Sidebar extends StatelessWidget {
  const _Sidebar({required this.location, required this.onNavigate});
  final String location;
  final void Function(String path) onNavigate;

  @override
  Widget build(BuildContext context) => Container(
        color: AppColors.sidebar,
        child: SafeArea(
          child: ListView(padding: const EdgeInsets.fromLTRB(12, 18, 12, 18), children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(10, 0, 10, 18),
              child: Row(children: [
                Icon(Icons.storefront_outlined, color: Colors.white),
                SizedBox(width: 10),
                Text('Klontonk', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: 0.3)),
                SizedBox(width: 6),
                Text('Dashboard', style: TextStyle(color: AppColors.sidebarMuted, fontSize: 12)),
              ]),
            ),
            for (final entry in navGroups.entries) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 14, 10, 6),
                child: Text(entry.key.toUpperCase(), style: const TextStyle(color: AppColors.sidebarMuted, fontSize: 10.5, letterSpacing: 0.9, fontWeight: FontWeight.w700)),
              ),
              for (final route in entry.value) _NavItem(route: route, active: location == route.path, onTap: () => onNavigate(route.path)),
            ],
          ]),
        ),
      );
}

class _NavItem extends StatelessWidget {
  const _NavItem({required this.route, required this.active, required this.onTap});
  final AppRoute route;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 1),
        child: Material(
          color: active ? const Color(0xFF1E293B) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(children: [
                Container(width: 3, height: 16, decoration: BoxDecoration(color: active ? const Color(0xFF60A5FA) : Colors.transparent, borderRadius: BorderRadius.circular(2))),
                const SizedBox(width: 10),
                Text(route.label, style: TextStyle(color: active ? Colors.white : const Color(0xFFB6C2D6), fontSize: 13.5, fontWeight: active ? FontWeight.w700 : FontWeight.w500)),
              ]),
            ),
          ),
        ),
      );
}

class _Topbar extends StatelessWidget {
  const _Topbar({required this.title, required this.subtitle, required this.showMenu});
  final String title;
  final String subtitle;
  final bool showMenu;

  @override
  Widget build(BuildContext context) {
    final deps = context.read<AppDeps>();
    final auth = context.watch<AuthViewModel>();
    final nama = auth.admin?.name ?? '';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(color: AppColors.surface, border: Border(bottom: BorderSide(color: AppColors.border))),
      child: SafeArea(
        bottom: false,
        child: Row(children: [
          if (showMenu) Builder(builder: (context) => IconButton(icon: const Icon(Icons.menu), tooltip: 'Menu', onPressed: () => Scaffold.of(context).openDrawer())),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: Theme.of(context).textTheme.headlineSmall, overflow: TextOverflow.ellipsis),
              if (subtitle.isNotEmpty) Text(subtitle, style: Theme.of(context).textTheme.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
            ]),
          ),
          if (AppConfig.demoMode) const Padding(padding: EdgeInsets.only(right: 10), child: Chip(label: Text('Mode demo'), visualDensity: VisualDensity.compact)),
          OutlinedButton.icon(onPressed: deps.reload.reload, icon: const Icon(Icons.refresh, size: 18), label: const Text('Muat ulang')),
          const SizedBox(width: 10),
          if (MediaQuery.sizeOf(context).width >= 620)
            Row(children: [
              CircleAvatar(radius: 15, backgroundColor: AppColors.primary, child: Text(initialOf(nama), style: const TextStyle(color: Colors.white, fontSize: 13))),
              const SizedBox(width: 8),
              Text(nama, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(width: 6),
            ]),
          if (!AppConfig.demoMode) IconButton(tooltip: 'Keluar', icon: const Icon(Icons.logout), onPressed: auth.logout),
        ]),
      ),
    );
  }
}

/// Peringatan bila daftar acuan (klien/paket/cabang) gagal dimuat -- dropdown filter akan kosong.
class _LookupBanner extends StatelessWidget {
  const _LookupBanner();

  @override
  Widget build(BuildContext context) {
    final lookups = context.watch<AppDeps>().lookups;
    return ListenableBuilder(
      listenable: lookups,
      builder: (context, _) {
        final error = lookups.error;
        if (error == null) return const SizedBox.shrink();
        return Container(
          width: double.infinity,
          color: const Color(0xFFFDF1DC),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(children: [
            Expanded(child: Text('Daftar klien/cabang belum termuat: $error', style: const TextStyle(color: Color(0xFFB45309), fontSize: 13))),
            TextButton(onPressed: lookups.refresh, child: const Text('Coba lagi')),
          ]),
        );
      },
    );
  }
}
