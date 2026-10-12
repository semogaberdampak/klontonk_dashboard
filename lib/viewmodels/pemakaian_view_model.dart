import '../core/csv.dart';
import '../core/dates.dart';
import '../core/result.dart';
import '../data/models/models.dart';
import '../services/services.dart';
import 'app_deps.dart';
import 'resource_view_model.dart';

/// Aktivitas harian satu client. Angkanya dihitung DATABASE lewat RPC usage_daily() (bukan di
/// aplikasi), sehingga tetap ringan walau data sudah menumpuk bertahun-tahun.
const _path = '/pemakaian';

class PemakaianFilters {
  const PemakaianFilters({this.client = '', required this.dari, required this.sampai});
  final String client;
  final String dari;
  final String sampai;
}

PemakaianFilters parsePemakaianFilters(Map<String, String> p, [DateTime? now]) => PemakaianFilters(
      client: p['client'] ?? '',
      dari: (p['dari'] ?? '').isNotEmpty ? p['dari']! : tanggalJakarta(-29, now),
      sampai: (p['sampai'] ?? '').isNotEmpty ? p['sampai']! : tanggalJakarta(0, now),
    );

class UsageTotals {
  const UsageTotals({this.trx = 0, this.omzet = 0, this.retur = 0, this.nilaiRetur = 0, this.log = 0, this.error = 0});
  final num trx;
  final num omzet;
  final num retur;
  final num nilaiRetur;
  final num log;
  final num error;
}

UsageTotals totalUsage(List<UsageDay> harian) => harian.fold(
      const UsageTotals(),
      (t, r) => UsageTotals(
        trx: t.trx + r.trxCount,
        omzet: t.omzet + r.trxTotal,
        retur: t.retur + r.returnCount,
        nilaiRetur: t.nilaiRetur + r.returnAmount,
        log: t.log + r.logCount,
        error: t.error + r.eventCount,
      ),
    );

class PemakaianData {
  const PemakaianData({required this.daftar, this.klien, required this.harian});
  final List<ClientOverview> daftar;
  final ClientOverview? klien;
  final List<UsageDay> harian;
}

class PemakaianViewModel extends ResourceViewModel<PemakaianData> {
  PemakaianViewModel(super.deps, this.go, this.filters);
  final Go go;
  final PemakaianFilters filters;

  @override
  Future<Result<PemakaianData>> fetch() async {
    final hasil = await Future.wait<Object?>([
      deps.overview.list(),
      filters.client.isEmpty ? Future.value(const Ok<List<UsageDay>>([])) : deps.sales.dailyUsage(filters.client, filters.dari, filters.sampai),
    ]);
    final overview = hasil[0] as Result<List<ClientOverview>>;
    if (overview case Err(:final error)) return Err(error);
    final harian = hasil[1] as Result<List<UsageDay>>;
    if (harian case Err(:final error)) return Err(error);
    final daftar = (overview as Ok<List<ClientOverview>>).data;
    final cocok = daftar.where((c) => c.id == filters.client);
    return Ok(PemakaianData(daftar: daftar, klien: cocok.isEmpty ? null : cocok.first, harian: (harian as Ok<List<UsageDay>>).data));
  }

  void apply(String client, String dari, String sampai) => go(_path, {'client': client, 'dari': dari, 'sampai': sampai});
  void lastDays(int hari) => go(_path, {'client': filters.client, 'dari': tanggalJakarta(-(hari - 1)), 'sampai': tanggalJakarta()});

  void exportCsv() {
    final harian = data?.harian ?? const <UsageDay>[];
    if (harian.isEmpty) return deps.toast.show('Tidak ada data untuk diunduh.', type: ToastType.warning);
    final csv = toCsv<UsageDay>(harian, [
      CsvColumn('tanggal', (r) => r.day),
      CsvColumn('transaksi', (r) => r.trxCount),
      CsvColumn('omzet', (r) => r.trxTotal),
      CsvColumn('retur', (r) => r.returnCount),
      CsvColumn('nilai_retur', (r) => r.returnAmount),
      CsvColumn('log_audit', (r) => r.logCount),
      CsvColumn('error', (r) => r.eventCount),
    ]);
    downloadCsv('pemakaian-${filters.client}-${filters.dari}-${filters.sampai}.csv', csv);
    deps.toast.show('CSV diunduh.', type: ToastType.success);
  }
}
