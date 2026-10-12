import '../core/csv.dart';
import '../core/dates.dart';
import '../core/format.dart';
import '../core/query.dart';
import '../core/result.dart';
import '../data/models/models.dart';
import '../data/repositories/log_repository.dart';
import '../services/services.dart';
import 'app_deps.dart';
import 'resource_view_model.dart';

/// Dicatat OTOMATIS oleh trigger database (db/dashboard-schema.sql), bukan oleh aplikasi.
/// Sifatnya append-only -- client tidak bisa menyunting atau menghapus baris log.
const auditLimit = 50;
const _path = '/log-audit';

const aksiOptions = [
  Option('', 'Semua aksi'),
  Option('sale.checkout', 'Penjualan dicatat'),
  Option('return.process', 'Retur diproses'),
  Option('stock.create', 'Barang ditambahkan'),
  Option('stock.update', 'Stok diubah'),
  Option('stock.delete', 'Barang dihapus'),
  Option('price.update', 'Harga diubah'),
  Option('user.create', 'Akun dibuat'),
  Option('user.update', 'Akun diubah'),
  Option('user.delete', 'Akun dihapus'),
  Option('auth.login', 'Login aplikasi POS'),
  Option('client.create', 'Client dibuat'),
  Option('client.update', 'Client diubah'),
  Option('branch.create', 'Cabang dibuat'),
  Option('branch.update', 'Cabang diubah'),
  Option('branch.delete', 'Cabang dihapus'),
  Option('plan.create', 'Paket dibuat'),
  Option('plan.update', 'Paket diubah'),
  Option('plan.delete', 'Paket dihapus'),
  Option('subscription.create', 'Langganan dicatat'),
  Option('subscription.update', 'Langganan diubah'),
  Option('subscription.delete', 'Langganan dihapus'),
];

Tone toneAksi(String aksi) {
  if (aksi.endsWith('.delete')) return Tone.bad;
  if (aksi == 'sale.checkout') return Tone.ok;
  if (aksi == 'return.process') return Tone.warn;
  if (aksi.startsWith('auth.')) return Tone.info;
  return Tone.none;
}

class AuditPageFilters {
  const AuditPageFilters({this.client = '', this.tenant = '', this.aksi = '', this.pelaku = '', this.dari = '', this.sampai = '', this.offset = 0});
  final String client;
  final String tenant;
  final String aksi;
  final String pelaku;
  final String dari;
  final String sampai;
  final int offset;

  Map<String, String> toParams({int? offset}) => {'client': client, 'tenant': tenant, 'aksi': aksi, 'pelaku': pelaku, 'dari': dari, 'sampai': sampai, if (offset != null) 'offset': '$offset'};
}

AuditPageFilters parseAuditFilters(Map<String, String> p, [DateTime? now]) {
  final adaTanggal = p.containsKey('dari') || p.containsKey('sampai');
  String tanggal(String? nilai, int offset) => (nilai != null && nilai.isNotEmpty) ? nilai : (adaTanggal ? '' : tanggalJakarta(offset, now));
  return AuditPageFilters(
    client: p['client'] ?? '',
    tenant: p['tenant'] ?? '',
    aksi: p['aksi'] ?? '',
    pelaku: (p['pelaku'] ?? '').trim(),
    dari: tanggal(p['dari'], -7),
    sampai: tanggal(p['sampai'], 0),
    offset: parseOffset(p['offset']),
  );
}

class LogAuditViewModel extends ResourceViewModel<PageResult<AuditLog>> {
  LogAuditViewModel(super.deps, this.go, this.filters);
  final Go go;
  final AuditPageFilters filters;

  @override
  Future<Result<PageResult<AuditLog>>> fetch() {
    final ids = deps.lookups.api.tenantIdsFor(filters.client, filters.tenant);
    return deps.logs.pageAudit(
      AuditFilters(
        tenantIds: (ids != null && ids.isNotEmpty) ? ids : null,
        aksi: filters.aksi,
        pelaku: bersihkanKataKunci(filters.pelaku),
        dariIso: batasWaktu(filters.dari),
        sampaiIso: batasWaktu(filters.sampai, akhir: true),
        offset: filters.offset,
      ),
      auditLimit,
    );
  }

  void apply(AuditPageFilters d) => go(_path, AuditPageFilters(client: d.client, tenant: d.tenant, aksi: d.aksi, pelaku: d.pelaku.trim(), dari: d.dari, sampai: d.sampai).toParams());
  void clear() => go(_path, {'dari': '', 'sampai': ''});
  void goPage(int offset) => go(_path, filters.toParams(offset: offset));
  void changeClient(String client, AuditPageFilters d) => go(_path, {'client': client, 'aksi': d.aksi, 'pelaku': d.pelaku.trim(), 'dari': d.dari, 'sampai': d.sampai});

  void exportCsv() {
    final rows = data?.rows ?? const <AuditLog>[];
    if (rows.isEmpty) return deps.toast.show('Tidak ada data untuk diunduh.', type: ToastType.warning);
    final csv = toCsv<AuditLog>(rows, [
      CsvColumn('waktu', (r) => r.at),
      CsvColumn('pelaku', (r) => r.actorName ?? ''),
      CsvColumn('peran', (r) => r.actorRole ?? ''),
      CsvColumn('aksi', (r) => r.action),
      CsvColumn('objek', (r) => r.entity),
      CsvColumn('objek_id', (r) => r.entityId ?? ''),
      CsvColumn('client', (r) => r.clientId ?? ''),
      CsvColumn('cabang', (r) => r.tenantId ?? ''),
      CsvColumn('rincian', (r) => prettyDetail(r.detail)),
    ]);
    downloadCsv('log-audit-${tanggalJakarta()}.csv', csv);
    deps.toast.show('CSV diunduh (hanya baris yang tampil).', type: ToastType.success);
  }

  Future<void> detail(AuditLog b) => deps.dialog.notify(
        title: '${b.action} - ${b.entity}',
        message: 'Waktu: ${formatDateTime(b.at)}\nPelaku: ${b.actorName ?? '-'} (${b.actorRole ?? '-'})\nObjek: ${b.entity} ${b.entityId ?? ''}\nCabang: ${b.tenantId ?? '-'}\nClient: ${b.clientId ?? '-'}\n\nRincian:\n${prettyDetail(b.detail)}\n\nData mentah:\n${b.detail}',
      );
}
