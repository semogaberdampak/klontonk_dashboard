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

/// Error/peringatan yang dikirim dari perangkat client (tabel client_events). Aplikasi POS belum
/// mengirim log ini otomatis (lihat README, bagian Integrasi POS).
const teknisLimit = 50;
const _path = '/log-teknis';
const _levels = ['error', 'warn', 'info'];

const levelOptions = [Option('', 'Semua level'), Option('error', 'Error'), Option('warn', 'Peringatan'), Option('info', 'Info')];

Tone levelTone(String level) => const {'error': Tone.bad, 'warn': Tone.warn, 'info': Tone.info}[level] ?? Tone.none;

class TeknisPageFilters {
  const TeknisPageFilters({this.level = '', this.client = '', this.tenant = '', this.cari = '', this.dari = '', this.sampai = '', this.offset = 0});
  final String level;
  final String client;
  final String tenant;
  final String cari;
  final String dari;
  final String sampai;
  final int offset;

  Map<String, String> toParams({int? offset}) => {'level': level, 'client': client, 'tenant': tenant, 'cari': cari, 'dari': dari, 'sampai': sampai, if (offset != null) 'offset': '$offset'};
}

TeknisPageFilters parseTeknisFilters(Map<String, String> p, [DateTime? now]) {
  final adaTanggal = p.containsKey('dari') || p.containsKey('sampai');
  String tanggal(String? nilai, int offset) => (nilai != null && nilai.isNotEmpty) ? nilai : (adaTanggal ? '' : tanggalJakarta(offset, now));
  return TeknisPageFilters(
    level: oneOf(p['level'], _levels),
    client: p['client'] ?? '',
    tenant: p['tenant'] ?? '',
    cari: (p['cari'] ?? '').trim(),
    dari: tanggal(p['dari'], -7),
    sampai: tanggal(p['sampai'], 0),
    offset: parseOffset(p['offset']),
  );
}

class TeknisData {
  const TeknisData({required this.page, required this.error, required this.warn, required this.info});
  final PageResult<ClientEvent> page;
  final int error;
  final int warn;
  final int info;
}

class LogTeknisViewModel extends ResourceViewModel<TeknisData> {
  LogTeknisViewModel(super.deps, this.go, this.filters);
  final Go go;
  final TeknisPageFilters filters;

  @override
  Future<Result<TeknisData>> fetch() async {
    final ids = deps.lookups.api.tenantIdsFor(filters.client, filters.tenant);
    final clientId = filters.client.isNotEmpty && filters.tenant.isEmpty ? filters.client : '';
    final sampaiIso = batasWaktu(filters.sampai, akhir: true);

    final hasil = await Future.wait<Object?>([
      deps.logs.pageEvents(
        EventFilters(
          level: filters.level,
          tenantIds: (ids != null && ids.isNotEmpty) ? ids : null,
          clientId: clientId,
          cari: bersihkanKataKunci(filters.cari),
          dariIso: batasWaktu(filters.dari),
          sampaiIso: sampaiIso,
          offset: filters.offset,
        ),
        teknisLimit,
      ),
      deps.logs.countEvents('error', clientId, sampaiIso),
      deps.logs.countEvents('warn', clientId, sampaiIso),
      deps.logs.countEvents('info', clientId, sampaiIso),
    ]);
    final halaman = hasil[0] as Result<PageResult<ClientEvent>>;
    if (halaman case Err(:final error)) return Err(error);
    return Ok(TeknisData(
      page: (halaman as Ok<PageResult<ClientEvent>>).data,
      error: (hasil[1] as int?) ?? 0,
      warn: (hasil[2] as int?) ?? 0,
      info: (hasil[3] as int?) ?? 0,
    ));
  }

  void apply(TeknisPageFilters d) => go(_path, TeknisPageFilters(level: d.level, client: d.client, tenant: d.tenant, cari: d.cari.trim(), dari: d.dari, sampai: d.sampai).toParams());
  void clear() => go(_path, {'dari': '', 'sampai': ''});
  void goPage(int offset) => go(_path, filters.toParams(offset: offset));
  void changeClient(String client, TeknisPageFilters d) => go(_path, {'level': d.level, 'client': client, 'cari': d.cari.trim(), 'dari': d.dari, 'sampai': d.sampai});

  void exportCsv() {
    final rows = data?.page.rows ?? const <ClientEvent>[];
    if (rows.isEmpty) return deps.toast.show('Tidak ada data untuk diunduh.', type: ToastType.warning);
    final csv = toCsv<ClientEvent>(rows, [
      CsvColumn('waktu', (r) => r.at),
      CsvColumn('level', (r) => r.level),
      CsvColumn('sumber', (r) => r.source),
      CsvColumn('pesan', (r) => r.message),
      CsvColumn('client', (r) => r.clientId ?? ''),
      CsvColumn('cabang', (r) => r.tenantId ?? ''),
      CsvColumn('versi', (r) => r.appVersion ?? ''),
      CsvColumn('perangkat', (r) => r.device ?? ''),
    ]);
    downloadCsv('log-teknis-${tanggalJakarta()}.csv', csv);
    deps.toast.show('CSV diunduh (hanya baris yang tampil).', type: ToastType.success);
  }

  Future<void> detail(ClientEvent b) => deps.dialog.notify(
        title: '${b.level.toUpperCase()} - ${b.source}',
        message: 'Waktu: ${formatDateTime(b.at)}\nClient: ${b.clientId ?? '-'}\nCabang: ${b.tenantId ?? '-'}\nVersi aplikasi: ${b.appVersion ?? '-'}\nPerangkat: ${b.device ?? '-'}\n\nPesan:\n${b.message}\n\nKonteks:\n${b.context}',
      );
}
