import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../viewmodels/app_deps.dart';
import '../../viewmodels/lookups_view_model.dart';
import '../../viewmodels/resource_view_model.dart';

/// Penghubung View <-> ViewModel untuk satu halaman: membuat ViewModel, memuat data, dan
/// membuatnya ulang saat tombol "Muat ulang" / setelah simpan (ReloadService). Halaman dibuat
/// ulang oleh router setiap URL (filter) berubah, jadi filter selalu mengikuti URL.
class VmPage<T extends ResourceViewModel<Object?>> extends StatefulWidget {
  const VmPage({super.key, required this.create, required this.builder});

  final T Function(AppDeps deps) create;
  final Widget Function(BuildContext context, T vm, LookupsApi lookups) builder;

  @override
  State<VmPage<T>> createState() => _VmPageState<T>();
}

class _VmPageState<T extends ResourceViewModel<Object?>> extends State<VmPage<T>> {
  late AppDeps _deps;
  late T _vm;
  late int _version;

  @override
  void initState() {
    super.initState();
    _deps = context.read<AppDeps>();
    _version = _deps.reload.version;
    _deps.reload.addListener(_onReload);
    _vm = _start();
  }

  T _start() => widget.create(_deps)..load();

  void _onReload() {
    if (_deps.reload.version == _version) return;
    _version = _deps.reload.version;
    final lama = _vm;
    setState(() => _vm = _start());
    // Buang ViewModel lama setelah frame berikut agar widget lama tidak mendengarkan objek yang sudah dibuang.
    WidgetsBinding.instance.addPostFrameCallback((_) => lama.dispose());
  }

  @override
  void dispose() {
    _deps.reload.removeListener(_onReload);
    _vm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lookups = context.watch<LookupsViewModel>().api;
    return ChangeNotifierProvider<T>.value(
      value: _vm,
      child: Consumer<T>(builder: (context, vm, _) => widget.builder(context, vm, lookups)),
    );
  }
}

/// Bungkus isi halaman: tombol aksi di kanan atas lalu isi.
class PageBody extends StatelessWidget {
  const PageBody({super.key, this.actions = const [], required this.children});
  final List<Widget> actions;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (actions.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: 14), child: Wrap(spacing: 10, runSpacing: 8, children: actions)),
          ...children,
        ]),
      );
}
