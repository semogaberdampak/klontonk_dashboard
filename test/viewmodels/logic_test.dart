import 'package:flutter_test/flutter_test.dart';
import 'package:klontonk_dashboard/data/models/models.dart';
import 'package:klontonk_dashboard/services/form_types.dart';
import 'package:klontonk_dashboard/viewmodels/langganan_view_model.dart';
import 'package:klontonk_dashboard/viewmodels/paket_view_model.dart';
import 'package:klontonk_dashboard/viewmodels/pemakaian_view_model.dart';
import 'package:klontonk_dashboard/viewmodels/pengaturan_view_model.dart';
import 'package:klontonk_dashboard/viewmodels/pengguna_view_model.dart';
import 'package:klontonk_dashboard/viewmodels/ringkasan_view_model.dart';
import 'package:klontonk_dashboard/viewmodels/transaksi_view_model.dart';

ClientOverview klien({String status = 'aktif', String? sub = 'aktif', num? hari = 60, num error = 0, num harga = 100000}) =>
    ClientOverview(id: 'C1', name: 'Klien', status: status, subStatus: sub, daysLeft: hari, errors7d: error, priceMonth: harga);

void main() {
  group('ringkasan', () {
    test('client sehat tidak perlu perhatian', () {
      expect(needsAttention(klien()), isFalse);
      expect(alasanPerhatian(klien()), '-');
    });

    test('langganan segera berakhir dan error dilaporkan', () {
      final c = klien(hari: 9, error: 3);
      expect(needsAttention(c), isTrue);
      expect(alasanPerhatian(c), 'langganan segera berakhir, 3 error dalam 7 hari');
    });

    test('client suspend dengan langganan lewat', () {
      expect(alasanPerhatian(klien(status: 'suspend', hari: -12)), 'client disuspend, langganan sudah berakhir');
    });

    test('tanpa langganan', () {
      expect(alasanPerhatian(klien(hari: null, sub: null)), 'belum ada langganan');
    });

    test('sumOf menjumlahkan kolom', () {
      expect(sumOf([klien(error: 2), klien(error: 5)], (c) => c.errors7d), 7);
    });
  });

  group('langganan', () {
    test('summarize memisah berlaku, trial, perhatian, dan potensi', () {
      final s = summarize([
        klien(sub: 'trial', hari: 20, harga: 50000),
        klien(sub: 'aktif', hari: 90, harga: 150000),
        klien(sub: 'aktif', hari: -3),
        klien(sub: 'berhenti', hari: 30),
      ]);
      expect(s.berlaku.length, 2);
      expect(s.trial.length, 1);
      expect(s.perhatian.length, 2);
      expect(s.potensi, 200000);
    });

    test('status filter di luar daftar dibuang', () {
      expect(parseLanggananFilters({'status': 'hack', 'offset': '-1'}).status, '');
      expect(parseLanggananFilters({'status': 'trial', 'offset': '25'}).offset, 25);
    });
  });

  group('pemakaian', () {
    final now = DateTime.utc(2026, 10, 12, 5);

    test('tanggal bawaan 30 hari terakhir bila kosong', () {
      final f = parsePemakaianFilters({}, now);
      expect(f.dari, '2026-09-13');
      expect(f.sampai, '2026-10-12');
    });

    test('tanggal dari URL dipakai apa adanya', () {
      expect(parsePemakaianFilters({'dari': '2026-01-01', 'sampai': '2026-01-31', 'client': 'C1'}, now).dari, '2026-01-01');
    });

    test('totalUsage menjumlahkan semua hari', () {
      const hari = [
        UsageDay(day: '2026-10-01', trxCount: 3, trxTotal: 300, returnCount: 1, returnAmount: 20, logCount: 5, eventCount: 1),
        UsageDay(day: '2026-10-02', trxCount: 2, trxTotal: 200, returnCount: 0, returnAmount: 0, logCount: 4, eventCount: 0),
      ];
      final t = totalUsage(hari);
      expect([t.trx, t.omzet, t.retur, t.nilaiRetur, t.log, t.error], [5, 500, 1, 20, 9, 1]);
    });
  });

  group('transaksi', () {
    final now = DateTime.utc(2026, 10, 12, 5);

    test('tanpa parameter tanggal memakai rentang bawaan', () {
      expect(parseTransaksiFilters({}, now).dari, isNotEmpty);
    });

    test('tanggal kosong eksplisit berarti tanpa batas', () {
      final f = parseTransaksiFilters({'dari': '', 'sampai': ''}, now);
      expect(f.dari, '');
      expect(f.sampai, '');
    });

    test('metode di luar daftar dibuang', () {
      expect(parseTransaksiFilters({'metode': 'kartu'}, now).metode, '');
    });
  });

  group('pengguna', () {
    test('validateNewAccount menolak masukan lemah', () {
      expect(validateNewAccount('AB', 'abc12345', 'T1'), contains('Username'));
      expect(validateNewAccount('budi', 'abc12345', ''), contains('cabang'));
      expect(validateNewAccount('budi', 'abc', 'T1'), contains('minimal 8'));
      expect(validateNewAccount('budi', 'abcdefgh', 'T1'), contains('huruf dan angka'));
      expect(validateNewAccount('budi', 'budi12345', 'T1'), contains('username'));
    });

    test('masukan valid lolos', () {
      expect(validateNewAccount('budi', 'rahasia123', 'T1'), isNull);
    });
  });

  group('pengaturan', () {
    test('daysOrDefault memakai bawaan bila kosong, nol, atau rusak', () {
      expect(daysOrDefault('', 180), 180);
      expect(daysOrDefault('0', 180), 180);
      expect(daysOrDefault('abc', 60), 60);
      expect(daysOrDefault(' 90 ', 180), 90);
    });
  });

  group('paket', () {
    test('toPlanInput menjaga batas minimal 1 dan membersihkan catatan', () {
      final FormValues v = {'name': 'Basic', 'price_month': '100000', 'max_branches': '0', 'max_users': '3', 'is_active': true, 'note': ''};
      final input = toPlanInput(v);
      expect(input.maxBranches, 1);
      expect(input.maxUsers, 3);
      expect(input.priceMonth, 100000);
      expect(input.isActive, isTrue);
      expect(input.note, isNull);
    });
  });
}
