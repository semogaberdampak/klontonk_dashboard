import '../core/csv.dart';
import '../core/dates.dart';
import '../core/query.dart';
import '../core/result.dart';
import '../data/models/models.dart';
import '../data/repositories/sales_repository.dart';
import '../services/services.dart';
import 'app_deps.dart';
import 'resource_view_model.dart';

/// kind = 'pelanggan' (barang kembali ke stok, ada uang kembali) atau 'supplier' (barang
/// rusak/kedaluwarsa keluar dari stok, tanpa uang). Seperti transaksi, data hanya bisa dibaca.
const returLimit = 50;
const _path = '/retur';
const _kinds = ['pelanggan', 'supplier'];
const _reasons = ['rusak', 'kedaluwarsa', 'salah_barang', 'tidak_sesuai', 'lainnya'];

const jenisOptions = [Option('', 'Semua jenis'), Option('pelanggan', 'Dari pelanggan (stok masuk)'), Option('supplier', 'Ke supplier (stok keluar)')];
const alasanOptions = [
  Option('', 'Semua alasan'),
  Option('rusak', 'Rusak'),
  Option('kedaluwarsa', 'Kedaluwarsa'),
  Option('salah_barang', 'Salah barang'),
  Option('tidak_sesuai', 'Tidak sesuai'),
  Option('lainnya', 'Lainnya'),
];
const labelAlasan = {'rusak': 'Rusak', 'kedaluwarsa': 'Kedaluwarsa', 'salah_barang': 'Salah barang', 'tidak_sesuai': 'Tidak sesuai', 'lainnya': 'Lainnya'};

class ReturPageFilters {
  const ReturPageFilters({this.client = '', this.tenant = '', this.dari = '', this.sampai = '', this.jenis = '', this.alasan = '', this.cari = '', this.offset = 0});
  final String client;
  final String tenant;
  final String dari;
  final String sampai;
  final String jenis;
  final String alasan;
  final String cari;
  final int offset;

  Map<String, String> toParams({int? offset}) =>
      {'client': client, 'tenant': tenant, 'dari': dari, 'sampai': sampai, 'jenis': jenis, 'alasan': alasan, 'cari': cari, if (offset != null) 'offset': '$offset'};
}

ReturPageFilters parseReturFilters(Map<String, String> p, [DateTime? now]) {
  final adaTanggal = p.containsKey('dari') || p.containsKey('sampai');
  String tanggal(String? nilai, int offset) => (nilai != null && nilai.isNotEmpty) ? nilai : (adaTanggal ? '' : tanggalJakarta(offset, now));
  return ReturPageFilters(
    client: p['client'] ?? '',
    tenant: p['tenant'] ?? '',
    dari: tanggal(p['dari'], -30),
    sampai: tanggal(p['sampai'], 0),
    jenis: oneOf(p['jenis'], _kinds),
    alasan: oneOf(p['alasan'], _reasons),
    cari: (p['cari'] ?? '').trim(),
    offset: parseOffset(p['offset']),
  );
}

class ReturViewModel extends ResourceViewModel<PageResult<StockReturn>> {
  ReturViewModel(super.deps, this.go, this.filters);
  final Go go;
  final ReturPageFilters filters;

  @override
  Future<Result<PageResult<StockReturn>>> fetch() => deps.sales.pageReturns(
        ReturnFilters(
          tenantIds: deps.lookups.api.tenantIdsFor(filters.client, filters.tenant),
          dariIso: batasWaktu(filters.dari),
          sampaiIso: batasWaktu(filters.sampai, akhir: true),
          jenis: filters.jenis,
          alasan: filters.alasan,
          cari: bersihkanKataKunci(filters.cari),
          offset: filters.offset,
        ),
        returLimit,
      );

  void apply(ReturPageFilters d) => go(_path, ReturPageFilters(client: d.client, tenant: d.tenant, dari: d.dari, sampai: d.sampai, jenis: d.jenis, alasan: d.alasan, cari: d.cari.trim()).toParams());
  void clear() => go(_path, {'dari': '', 'sampai': ''});
  void goPage(int offset) => go(_path, filters.toParams(offset: offset));
  void changeClient(String client, ReturPageFilters d) => go(_path, {'client': client, 'dari': d.dari, 'sampai': d.sampai, 'jenis': d.jenis, 'alasan': d.alasan, 'cari': d.cari.trim()});

  void exportCsv() {
    final rows = data?.rows ?? const <StockReturn>[];
    if (rows.isEmpty) return deps.toast.show('Tidak ada data untuk diunduh.', type: ToastType.warning);
    final api = deps.lookups.api;
    final csv = toCsv<StockReturn>(rows, [
      CsvColumn('waktu', (r) => r.at),
      CsvColumn('no', (r) => r.no),
      CsvColumn('cabang_id', (r) => r.tenantId),
      CsvColumn('cabang', (r) => r.tenantName ?? ''),
      CsvColumn('client', (r) => r.tenantClientId == null ? '' : api.clientName(r.tenantClientId)),
      CsvColumn('jenis', (r) => r.kind),
      CsvColumn('barang', (r) => r.name),
      CsvColumn('jumlah', (r) => r.qty),
      CsvColumn('satuan', (r) => r.unit),
      CsvColumn('nilai', (r) => r.amount),
      CsvColumn('alasan', (r) => r.reason),
      CsvColumn('kasir', (r) => r.cashier),
      CsvColumn('catatan', (r) => r.note ?? ''),
    ]);
    downloadCsv('retur-${tanggalJakarta()}.csv', csv);
    deps.toast.show('CSV diunduh (hanya baris yang tampil).', type: ToastType.success);
  }
}
