import '../core/csv.dart';
import '../core/dates.dart';
import '../core/query.dart';
import '../core/result.dart';
import '../data/models/models.dart';
import '../data/repositories/sales_repository.dart';
import '../services/services.dart';
import 'app_deps.dart';
import 'resource_view_model.dart';

/// Data TIDAK bisa diubah dari dashboard -- disengaja: satu-satunya cara sah menambah penjualan
/// adalah lewat kasir di POS (fungsi checkout()), supaya stok dan struk konsisten.
const transaksiLimit = 50;
const _path = '/transaksi';
const _methods = ['tunai', 'nontunai'];

const metodeOptions = [Option('', 'Semua metode'), Option('tunai', 'Tunai'), Option('nontunai', 'Non-tunai')];

class TransaksiFilters {
  const TransaksiFilters({this.client = '', this.tenant = '', this.dari = '', this.sampai = '', this.metode = '', this.cari = '', this.offset = 0});
  final String client;
  final String tenant;
  final String dari;
  final String sampai;
  final String metode;
  final String cari;
  final int offset;

  Map<String, String> toParams({int? offset}) =>
      {'client': client, 'tenant': tenant, 'dari': dari, 'sampai': sampai, 'metode': metode, 'cari': cari, if (offset != null) 'offset': '$offset'};
}

/// Tanggal kosong EKSPLISIT di URL (?dari=&sampai=) berarti tanpa batas, bukan tanggal bawaan.
TransaksiFilters parseTransaksiFilters(Map<String, String> p, [DateTime? now]) {
  final adaTanggal = p.containsKey('dari') || p.containsKey('sampai');
  String tanggal(String? nilai, int offset) => (nilai != null && nilai.isNotEmpty) ? nilai : (adaTanggal ? '' : tanggalJakarta(offset, now));
  return TransaksiFilters(
    client: p['client'] ?? '',
    tenant: p['tenant'] ?? '',
    dari: tanggal(p['dari'], -30),
    sampai: tanggal(p['sampai'], 0),
    metode: oneOf(p['metode'], _methods),
    cari: (p['cari'] ?? '').trim(),
    offset: parseOffset(p['offset']),
  );
}

class TransaksiViewModel extends ResourceViewModel<PageResult<Sale>> {
  TransaksiViewModel(super.deps, this.go, this.filters);
  final Go go;
  final TransaksiFilters filters;

  @override
  Future<Result<PageResult<Sale>>> fetch() => deps.sales.pageSales(
        SalesFilters(
          tenantIds: deps.lookups.api.tenantIdsFor(filters.client, filters.tenant),
          dariIso: batasWaktu(filters.dari),
          sampaiIso: batasWaktu(filters.sampai, akhir: true),
          metode: filters.metode,
          cari: bersihkanKataKunci(filters.cari),
          offset: filters.offset,
        ),
        transaksiLimit,
      );

  void apply(TransaksiFilters draft) => go(_path, TransaksiFilters(client: draft.client, tenant: draft.tenant, dari: draft.dari, sampai: draft.sampai, metode: draft.metode, cari: draft.cari.trim()).toParams());
  void clear() => go(_path, {'dari': '', 'sampai': ''});
  void goPage(int offset) => go(_path, filters.toParams(offset: offset));
  void changeClient(String client, TransaksiFilters draft) => go(_path, {'client': client, 'dari': draft.dari, 'sampai': draft.sampai, 'metode': draft.metode, 'cari': draft.cari.trim()});

  void exportCsv() {
    final rows = data?.rows ?? const <Sale>[];
    if (rows.isEmpty) return deps.toast.show('Tidak ada data untuk diunduh.', type: ToastType.warning);
    final api = deps.lookups.api;
    final csv = toCsv<Sale>(rows, [
      CsvColumn('waktu', (r) => r.at),
      CsvColumn('no', (r) => r.no),
      CsvColumn('cabang_id', (r) => r.tenantId),
      CsvColumn('cabang', (r) => r.tenantName ?? ''),
      CsvColumn('client', (r) => r.tenantClientId == null ? '' : api.clientName(r.tenantClientId)),
      CsvColumn('kasir', (r) => r.cashier),
      CsvColumn('metode', (r) => r.method),
      CsvColumn('total', (r) => r.total),
      CsvColumn('dibayar', (r) => r.paid),
    ]);
    downloadCsv('transaksi-${tanggalJakarta()}.csv', csv);
    deps.toast.show('CSV diunduh (hanya baris yang tampil).', type: ToastType.success);
  }
}
