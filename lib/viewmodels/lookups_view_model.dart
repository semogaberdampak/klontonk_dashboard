import 'package:flutter/foundation.dart';

import '../core/result.dart';
import '../data/models/models.dart';
import '../data/repositories/lookup_repository.dart';
import '../services/services.dart';
import 'auth_view_model.dart';

/// Selektor atas daftar acuan (klien, paket, cabang) untuk dropdown dan label tabel.
class LookupsApi {
  const LookupsApi(this.data);
  final LookupsData data;

  ClientRef? client(String? id) {
    for (final c in data.clients) {
      if (c.id == id) return c;
    }
    return null;
  }

  String clientName(String? id) => client(id)?.name ?? id ?? '-';

  Plan? plan(String? code) {
    for (final p in data.plans) {
      if (p.code == code) return p;
    }
    return null;
  }

  Tenant? tenant(String? id) {
    for (final t in data.tenants) {
      if (t.id == id) return t;
    }
    return null;
  }

  List<Tenant> tenantsOf([String? clientId]) => data.tenants.where((t) => clientId == null || clientId.isEmpty || t.clientId == clientId).toList();

  List<Option> _withAll(List<Option> opsi, bool includeAll, String allLabel) => includeAll ? [Option('', allLabel), ...opsi] : opsi;

  List<Option> clientOptions({bool includeAll = false, String allLabel = 'Semua klien', String? status}) =>
      _withAll(data.clients.where((c) => status == null || c.status == status).map((c) => Option(c.id, '${c.id} - ${c.name}')).toList(), includeAll, allLabel);

  List<Option> planOptions({bool includeAll = false, String allLabel = 'Semua paket', bool activeOnly = false, bool excludeInternal = false}) => _withAll(
      data.plans.where((p) => (!activeOnly || p.isActive) && (!excludeInternal || p.code != 'internal')).map((p) => Option(p.code, '${p.name} (${p.code})')).toList(),
      includeAll,
      allLabel);

  List<Option> tenantOptions({String? clientId, bool includeAll = false, String allLabel = 'Semua cabang', bool withClient = false}) => _withAll(
      tenantsOf(clientId).map((t) => Option(t.id, withClient ? '${t.name} (${t.id}) - ${clientName(t.clientId)}' : '${t.name} (${t.id})')).toList(),
      includeAll,
      allLabel);

  /// Filter client/cabang -> daftar id cabang untuk klausa `in`. null bila tidak ada filter;
  /// daftar kosong bila client dipilih tetapi belum punya cabang (hasil query pun kosong).
  List<String>? tenantIdsFor(String clientId, String tenantId) {
    if (tenantId.isNotEmpty) return [tenantId];
    if (clientId.isNotEmpty) return tenantsOf(clientId).map((t) => t.id).toList();
    return null;
  }
}

/// Daftar acuan dimuat sekali lalu dipakai ulang semua halaman (daftarnya kecil, aman di memori).
class LookupsViewModel extends ChangeNotifier {
  LookupsViewModel(this._repo, this._toast);

  final LookupRepository _repo;
  final ToastService _toast;

  LookupsData _data = const LookupsData();
  bool ready = false;
  String? error;

  /// Diisi setelah AuthViewModel dibuat (menghindari ketergantungan melingkar).
  AuthViewModel? auth;

  LookupsApi get api => LookupsApi(_data);

  /// Muat ulang daftar acuan setelah klien/paket/cabang berubah.
  Future<void> refresh() async {
    final result = await _repo.load();
    switch (result) {
      case Ok(:final data):
        _data = data;
        error = null;
      case Err(:final error):
        if (error.expired) {
          auth?.expire();
        } else {
          this.error = error.message;
          _toast.show('Daftar acuan belum bisa dimuat: ${error.message}', type: ToastType.danger, duration: const Duration(seconds: 8));
        }
    }
    ready = true;
    notifyListeners();
  }

  void reset() {
    _data = const LookupsData();
    ready = false;
    notifyListeners();
  }
}
