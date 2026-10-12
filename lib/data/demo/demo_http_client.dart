import 'dart:convert';

import 'package:http/http.dart' as http;

/// MODE DEMO: pengganti HTTP ke Supabase yang menjawab dengan data contoh berbentuk PostgREST,
/// sehingga seluruh repository tetap sama dan dashboard bisa dilihat tanpa koneksi, akun, atau
/// database. Hanya dipakai bila aplikasi dibangun dengan --dart-define=DEMO_MODE=true.
/// Perubahan (tambah/ubah/hapus) dianggap berhasil tetapi TIDAK disimpan.
class DemoHttpClient extends http.BaseClient {
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final path = request.url.path;
    final marker = path.indexOf('/rest/v1/');
    if (marker < 0) return _json(request, 400, {'message': 'Mode demo: layanan ini tidak tersedia.'});

    final resource = path.substring(marker + '/rest/v1/'.length);
    final method = request.method.toUpperCase();
    final body = request is http.Request ? request.body : '';

    if (resource.startsWith('rpc/')) return _rpc(request, resource.substring(4));
    if (method == 'POST') return _insert(request, body);
    if (method == 'PATCH' || method == 'DELETE') {
      // update(...).select() mengharapkan daftar baris; selainnya tanpa isi.
      final wantsRows = (request.headers['Prefer'] ?? '').contains('return=representation');
      return wantsRows ? _json(request, 200, <dynamic>[]) : _empty(request, 204);
    }
    return _select(request, resource, method);
  }

  // ---------- SELECT ----------

  Future<http.StreamedResponse> _select(http.BaseRequest request, String table, String method) {
    var rows = _tables[table] ?? const <Map<String, dynamic>>[];
    request.url.queryParametersAll.forEach((key, values) {
      if (const {'select', 'order', 'limit', 'offset', 'or'}.contains(key)) return;
      final value = values.first;
      if (value.startsWith('eq.')) {
        final target = value.substring(3);
        rows = rows.where((r) => r[key]?.toString() == target).toList();
      } else if (value.startsWith('in.')) {
        final list = value.substring(4, value.length - 1).split(',').where((e) => e.isNotEmpty).toSet();
        rows = rows.where((r) => list.contains(r[key]?.toString())).toList();
      } else if (value.startsWith('ilike.')) {
        final needle = value.substring(6).replaceAll('*', '').toLowerCase();
        rows = rows.where((r) => (r[key]?.toString() ?? '').toLowerCase().contains(needle)).toList();
      }
    });

    final total = rows.length;
    var from = 0;
    var to = total - 1;
    final range = request.headers['Range'];
    if (range != null && range.contains('-')) {
      final parts = range.split('-');
      from = int.tryParse(parts[0]) ?? 0;
      to = int.tryParse(parts[1]) ?? to;
    }
    final limit = int.tryParse(request.url.queryParameters['limit'] ?? '');
    final slice = rows.skip(from).take(limit ?? (to - from + 1).clamp(0, 1 << 20)).toList();
    final headers = <String, String>{
      if ((request.headers['Prefer'] ?? '').contains('count=exact')) 'content-range': total == 0 ? '*/0' : '$from-${from + slice.length - 1}/$total',
    };

    if (method == 'HEAD') return _empty(request, 200, headers);
    if ((request.headers['Accept'] ?? '').contains('vnd.pgrst.object')) {
      if (slice.isEmpty) return _json(request, 406, {'code': 'PGRST116', 'message': 'JSON object requested, multiple (or no) rows returned', 'details': 'The result contains 0 rows'});
      return _json(request, 200, slice.first, headers);
    }
    return _json(request, 200, slice, headers);
  }

  // ---------- INSERT / RPC ----------

  Future<http.StreamedResponse> _insert(http.BaseRequest request, String body) {
    final payload = body.isEmpty ? <String, dynamic>{} : (jsonDecode(body) as Object);
    final row = <String, dynamic>{'id': 'T099', if (payload is Map) ...Map<String, dynamic>.from(payload)};
    if ((request.headers['Prefer'] ?? '').contains('return=representation')) {
      final single = (request.headers['Accept'] ?? '').contains('vnd.pgrst.object');
      return _json(request, 201, single ? row : [row]);
    }
    return _empty(request, 201);
  }

  Future<http.StreamedResponse> _rpc(http.BaseRequest request, String name) {
    switch (name) {
      case 'usage_daily':
        return _json(request, 200, _usageDaily());
      case 'purge_old_logs':
        return _json(request, 200, {'audit_deleted': 0, 'events_deleted': 0});
      default:
        return _empty(request, 204);
    }
  }

  // ---------- Respons ----------

  Future<http.StreamedResponse> _json(http.BaseRequest request, int status, Object? data, [Map<String, String> extra = const {}]) async {
    final bytes = utf8.encode(jsonEncode(data));
    return http.StreamedResponse(Stream.value(bytes), status, contentLength: bytes.length, request: request, headers: {'content-type': 'application/json; charset=utf-8', ...extra});
  }

  Future<http.StreamedResponse> _empty(http.BaseRequest request, int status, [Map<String, String> headers = const {}]) async =>
      http.StreamedResponse(const Stream.empty(), status, contentLength: 0, request: request, headers: headers);
}

// ---------- Data contoh ----------

String _isoDaysAgo(int days, [int hour = 10]) {
  final d = DateTime.now().toUtc().subtract(Duration(days: days));
  return DateTime.utc(d.year, d.month, d.day, hour, 15).toIso8601String();
}

String _dateAhead(int days) => DateTime.now().toUtc().add(Duration(days: days)).toIso8601String().substring(0, 10);

List<Map<String, dynamic>> _usageDaily() => List.generate(14, (i) {
      final day = DateTime.now().toUtc().subtract(Duration(days: 13 - i));
      return {
        'day': day.toIso8601String().substring(0, 10),
        'trx_count': 30 + ((i * 7) % 25),
        'trx_total': 900000 + ((i * 137000) % 700000),
        'return_count': i % 4 == 0 ? 1 : 0,
        'return_amount': i % 4 == 0 ? 27000 : 0,
        'log_count': 60 + ((i * 11) % 40),
        'event_count': i % 6 == 0 ? 2 : 0,
      };
    });

final Map<String, List<Map<String, dynamic>>> _tables = {
  'platform_admins': [
    {'id': 'demo-admin', 'name': 'Admin Demo'}
  ],
  'clients': [
    {'id': 'C0001', 'name': 'Warung Bu Sari', 'status': 'aktif', 'contact_name': 'Bu Sari', 'contact_phone': '081234567890', 'contact_email': 'sari@contoh.com', 'note': null},
    {'id': 'C0002', 'name': 'Toko Sembako Budi', 'status': 'aktif', 'contact_name': 'Pak Budi', 'contact_phone': '081298765432', 'contact_email': null, 'note': 'Pelanggan sejak 2025'},
    {'id': 'C0003', 'name': 'Kedai Kopi Senja', 'status': 'suspend', 'contact_name': 'Rani', 'contact_phone': '085611223344', 'contact_email': 'rani@kopisenja.id', 'note': null},
  ],
  'plans': [
    {'code': 'umkm_basic', 'name': 'UMKM Basic', 'price_month': 100000, 'max_branches': 1, 'max_users': 3, 'is_active': true, 'note': 'Untuk satu warung'},
    {'code': 'umkm_plus', 'name': 'UMKM Plus', 'price_month': 250000, 'max_branches': 3, 'max_users': 10, 'is_active': true, 'note': null},
    {'code': 'internal', 'name': 'Internal', 'price_month': 0, 'max_branches': 99, 'max_users': 99, 'is_active': true, 'note': 'Non-langganan'},
  ],
  'tenants': [
    {'id': 'T001', 'name': 'Warung Pusat', 'client_id': 'C0001'},
    {'id': 'T002', 'name': 'Warung Pasar', 'client_id': 'C0001'},
    {'id': 'T003', 'name': 'Toko Utama', 'client_id': 'C0002'},
    {'id': 'T004', 'name': 'Kedai Senja', 'client_id': 'C0003'},
  ],
  'v_client_overview': [
    {
      'id': 'C0001', 'name': 'Warung Bu Sari', 'status': 'aktif', 'contact_name': 'Bu Sari', 'contact_phone': '081234567890', 'contact_email': 'sari@contoh.com', 'note': null,
      'plan_code': 'umkm_plus', 'plan_name': 'UMKM Plus', 'price_month': 250000, 'sub_status': 'aktif', 'days_left': 92, 'expires_at': _dateAhead(92),
      'branch_count': 2, 'user_count': 5, 'trx_30d': 1284, 'omzet_30d': 38450000, 'logs_7d': 310, 'errors_7d': 0,
    },
    {
      'id': 'C0002', 'name': 'Toko Sembako Budi', 'status': 'aktif', 'contact_name': 'Pak Budi', 'contact_phone': '081298765432', 'contact_email': null, 'note': 'Pelanggan sejak 2025',
      'plan_code': 'umkm_basic', 'plan_name': 'UMKM Basic', 'price_month': 100000, 'sub_status': 'aktif', 'days_left': 9, 'expires_at': _dateAhead(9),
      'branch_count': 1, 'user_count': 2, 'trx_30d': 642, 'omzet_30d': 21900000, 'logs_7d': 120, 'errors_7d': 3,
    },
    {
      'id': 'C0003', 'name': 'Kedai Kopi Senja', 'status': 'suspend', 'contact_name': 'Rani', 'contact_phone': '085611223344', 'contact_email': 'rani@kopisenja.id', 'note': null,
      'plan_code': 'umkm_basic', 'plan_name': 'UMKM Basic', 'price_month': 100000, 'sub_status': 'jatuh_tempo', 'days_left': -12, 'expires_at': _dateAhead(-12),
      'branch_count': 1, 'user_count': 2, 'trx_30d': 18, 'omzet_30d': 540000, 'logs_7d': 4, 'errors_7d': 0,
    },
  ],
  'subscriptions': [
    {'id': 1, 'client_id': 'C0001', 'plan_code': 'umkm_plus', 'started_at': _dateAhead(-273), 'expires_at': _dateAhead(92), 'status': 'aktif', 'note': 'Transfer 1 tahun', 'client': {'name': 'Warung Bu Sari', 'status': 'aktif'}, 'plan': {'name': 'UMKM Plus', 'price_month': 250000}},
    {'id': 2, 'client_id': 'C0002', 'plan_code': 'umkm_basic', 'started_at': _dateAhead(-21), 'expires_at': _dateAhead(9), 'status': 'aktif', 'note': null, 'client': {'name': 'Toko Sembako Budi', 'status': 'aktif'}, 'plan': {'name': 'UMKM Basic', 'price_month': 100000}},
    {'id': 3, 'client_id': 'C0003', 'plan_code': 'umkm_basic', 'started_at': _dateAhead(-42), 'expires_at': _dateAhead(-12), 'status': 'jatuh_tempo', 'note': 'Belum bayar', 'client': {'name': 'Kedai Kopi Senja', 'status': 'suspend'}, 'plan': {'name': 'UMKM Basic', 'price_month': 100000}},
  ],
  'profiles': [
    {'id': 'u1', 'username': 'c0001.sari', 'name': 'Bu Sari', 'role': 'admin', 'avatar': 'B', 'tenant_id': 'T001', 'created_at': _isoDaysAgo(270)},
    {'id': 'u2', 'username': 'c0001.dewi', 'name': 'Dewi Kasir', 'role': 'cashier', 'avatar': 'D', 'tenant_id': 'T001', 'created_at': _isoDaysAgo(260)},
    {'id': 'u3', 'username': 'c0002.budi', 'name': 'Pak Budi', 'role': 'admin', 'avatar': 'P', 'tenant_id': 'T003', 'created_at': _isoDaysAgo(120)},
    {'id': 'u4', 'username': 'c0003.rani', 'name': 'Rani', 'role': 'admin', 'avatar': 'R', 'tenant_id': 'T004', 'created_at': _isoDaysAgo(40)},
  ],
  'audit_logs': [
    {'at': _isoDaysAgo(0, 9), 'actor_name': 'Dewi Kasir', 'actor_role': 'cashier', 'action': 'sale.checkout', 'entity': 'sales', 'entity_id': 'TRX-2026-0412', 'client_id': 'C0001', 'tenant_id': 'T001', 'detail': {'total': 87500, 'method': 'tunai'}},
    {'at': _isoDaysAgo(0, 8), 'actor_name': 'Bu Sari', 'actor_role': 'admin', 'action': 'price.update', 'entity': 'stock_items', 'entity_id': 'B-017', 'client_id': 'C0001', 'tenant_id': 'T001', 'detail': {'price': {'dari': 12000, 'jadi': 13500}}},
    {'at': _isoDaysAgo(1, 14), 'actor_name': 'Pak Budi', 'actor_role': 'admin', 'action': 'stock.update', 'entity': 'stock_items', 'entity_id': 'B-102', 'client_id': 'C0002', 'tenant_id': 'T003', 'detail': {'qty': {'dari': 40, 'jadi': 32}}},
    {'at': _isoDaysAgo(2, 11), 'actor_name': 'Admin Demo', 'actor_role': 'superadmin', 'action': 'subscription.update', 'entity': 'subscriptions', 'entity_id': '2', 'client_id': 'C0002', 'tenant_id': null, 'detail': {'status': {'dari': 'trial', 'jadi': 'aktif'}}},
    {'at': _isoDaysAgo(3, 16), 'actor_name': 'Rani', 'actor_role': 'admin', 'action': 'user.delete', 'entity': 'profiles', 'entity_id': 'c0003.andi', 'client_id': 'C0003', 'tenant_id': 'T004', 'detail': {'username': 'c0003.andi'}},
  ],
  'client_events': [
    {'at': _isoDaysAgo(0, 7), 'level': 'error', 'source': 'StockStore', 'message': 'Gagal menyimpan stok ke database (timeout)', 'context': {'item': 'B-102', 'percobaan': 3}, 'app_version': '1.4.2', 'device': 'Android 13', 'client_id': 'C0002', 'tenant_id': 'T003'},
    {'at': _isoDaysAgo(1, 15), 'level': 'error', 'source': 'window', 'message': 'Uncaught TypeError: Cannot read properties of undefined', 'context': null, 'app_version': '1.4.2', 'device': 'Chrome 126', 'client_id': 'C0002', 'tenant_id': 'T003'},
    {'at': _isoDaysAgo(2, 10), 'level': 'warn', 'source': 'sync', 'message': 'Antrian sinkron menumpuk (12 item)', 'context': {'antrian': 12}, 'app_version': '1.4.1', 'device': 'Android 12', 'client_id': 'C0001', 'tenant_id': 'T002'},
    {'at': _isoDaysAgo(4, 9), 'level': 'info', 'source': 'app', 'message': 'Aplikasi diperbarui ke 1.4.2', 'context': null, 'app_version': '1.4.2', 'device': 'Chrome 126', 'client_id': 'C0001', 'tenant_id': 'T001'},
  ],
  'sales': [
    {'tenant_id': 'T001', 'no': 'TRX-2026-0412', 'at': _isoDaysAgo(0, 9), 'cashier': 'Dewi Kasir', 'method': 'tunai', 'total': 87500, 'paid': 100000, 'tenant': {'name': 'Warung Pusat', 'client_id': 'C0001'}},
    {'tenant_id': 'T001', 'no': 'TRX-2026-0411', 'at': _isoDaysAgo(0, 8), 'cashier': 'Dewi Kasir', 'method': 'nontunai', 'total': 154000, 'paid': 154000, 'tenant': {'name': 'Warung Pusat', 'client_id': 'C0001'}},
    {'tenant_id': 'T002', 'no': 'TRX-2026-0410', 'at': _isoDaysAgo(1, 17), 'cashier': 'Bu Sari', 'method': 'tunai', 'total': 32000, 'paid': 50000, 'tenant': {'name': 'Warung Pasar', 'client_id': 'C0001'}},
    {'tenant_id': 'T003', 'no': 'TRX-2026-0409', 'at': _isoDaysAgo(1, 13), 'cashier': 'Pak Budi', 'method': 'tunai', 'total': 212500, 'paid': 250000, 'tenant': {'name': 'Toko Utama', 'client_id': 'C0002'}},
    {'tenant_id': 'T003', 'no': 'TRX-2026-0408', 'at': _isoDaysAgo(2, 12), 'cashier': 'Pak Budi', 'method': 'nontunai', 'total': 98000, 'paid': 98000, 'tenant': {'name': 'Toko Utama', 'client_id': 'C0002'}},
  ],
  'stock_returns': [
    {'tenant_id': 'T001', 'no': 'RTR-2026-0031', 'at': _isoDaysAgo(0, 10), 'cashier': 'Dewi Kasir', 'kind': 'pelanggan', 'item_id': 'B-017', 'name': 'Kopi Susu 250ml', 'unit': 'cup', 'qty': 2, 'amount': 27000, 'reason': 'salah_barang', 'note': 'Pesanan tertukar', 'tenant': {'name': 'Warung Pusat', 'client_id': 'C0001'}},
    {'tenant_id': 'T003', 'no': 'RTR-2026-0030', 'at': _isoDaysAgo(3, 11), 'cashier': 'Pak Budi', 'kind': 'supplier', 'item_id': 'B-102', 'name': 'Minyak Goreng 1L', 'unit': 'pcs', 'qty': 6, 'amount': 0, 'reason': 'kedaluwarsa', 'note': null, 'tenant': {'name': 'Toko Utama', 'client_id': 'C0002'}},
  ],
};
