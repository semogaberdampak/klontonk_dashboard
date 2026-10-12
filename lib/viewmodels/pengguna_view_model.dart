import '../core/config.dart';
import '../core/format.dart';
import '../core/query.dart';
import '../core/result.dart';
import '../data/models/models.dart';
import '../data/repositories/profile_repository.dart';
import '../services/form_types.dart';
import '../services/services.dart';
import 'app_deps.dart';
import 'resource_view_model.dart';

/// Akun ini dipakai untuk login ke APLIKASI POS memakai USERNAME (bukan email): aplikasi POS memetakan
/// username -> <username>@{emailDomain}. Username unik GLOBAL di database, jadi selalu pakai awalan
/// kode client (cth: c0001.budi). Buat akun hanya setelah client + cabang + langganan siap, karena
/// trigger batas paket (max_users) menolak bila kuota habis.
const penggunaLimit = 25;
const _path = '/pengguna';
final usernamePola = RegExp(r'^[a-z0-9_.]{3,24}$');

class PenggunaFilters {
  const PenggunaFilters({this.client = '', this.tenant = '', this.cari = '', this.offset = 0});
  final String client;
  final String tenant;
  final String cari;
  final int offset;
}

PenggunaFilters parsePenggunaFilters(Map<String, String> p) =>
    PenggunaFilters(client: p['client'] ?? '', tenant: p['tenant'] ?? '', cari: bersihkanKataKunci(p['cari']), offset: parseOffset(p['offset']));

/// Pesan kesalahan pertama dari aturan password/username, atau null bila lolos.
String? validateNewAccount(String username, String password, String tenant) {
  if (!usernamePola.hasMatch(username)) return 'Username 3-24 karakter: huruf kecil, angka, titik, underscore.';
  if (tenant.isEmpty) return 'Pilih cabang lebih dulu (client belum punya cabang?).';
  if (password.length < 8) return 'Password minimal 8 karakter.';
  if (!RegExp(r'[A-Za-z]').hasMatch(password) || !RegExp(r'[0-9]').hasMatch(password)) return 'Password harus mengandung huruf dan angka.';
  if (password.toLowerCase().contains(username)) return 'Password tidak boleh mengandung username.';
  return null;
}

String _role(Object? value) => value == 'admin' ? 'admin' : 'cashier';

class PenggunaViewModel extends ResourceViewModel<PageResult<Profile>> {
  PenggunaViewModel(super.deps, this.go, this.filters);
  final Go go;
  final PenggunaFilters filters;

  @override
  Future<Result<PageResult<Profile>>> fetch() => deps.profiles.page(
        ProfileFilters(tenantIds: deps.lookups.api.tenantIdsFor(filters.client, filters.tenant), cari: filters.cari, offset: filters.offset),
        penggunaLimit,
      );

  void apply(String client, String tenant, String cari) => go(_path, {'client': client, 'tenant': tenant, 'cari': cari.trim()});
  void clear() => go(_path);
  void goPage(int offset) => go(_path, {'client': filters.client, 'tenant': filters.tenant, 'cari': filters.cari, 'offset': '$offset'});

  /// Ganti client: cabang pada filter ikut menyesuaikan (mulai dari semua cabang client itu).
  void changeClient(String client, String cari) => go(_path, {'client': client, 'cari': cari.trim()});

  Future<void> tambah() {
    final api = deps.lookups.api;
    final opsiClient = api.clientOptions();
    final clientTerpilih = filters.client.isNotEmpty ? filters.client : (opsiClient.isEmpty ? '' : opsiClient.first.value);
    final opsiCabang = api.tenantOptions(clientId: clientTerpilih);
    final awalan = clientTerpilih.isEmpty ? '' : '${clientTerpilih.toLowerCase()}.';

    return deps.dialog.form(FormSpec(
      title: 'Buat akun client',
      note: 'Akun langsung bisa dipakai login di aplikasi POS memakai username. Pastikan Authentication -> Providers -> Email -> "Confirm email" sudah DIMATIKAN, supaya akun baru tidak menunggu konfirmasi email (${AppConfig.emailDomain} tidak menerima surat).',
      submitText: 'Buat akun',
      wide: true,
      fields: [
        FormFieldSpec(name: 'client', label: 'Client', type: FieldType.select, required: true, options: opsiClient),
        FormFieldSpec(
          name: 'tenant',
          label: 'Cabang',
          type: FieldType.select,
          required: true,
          options: opsiCabang.isEmpty ? const [Option('', 'Belum ada cabang -- buat cabang dulu')] : opsiCabang,
          hint: 'Akun kasir hanya bisa mengakses cabang ini.',
        ),
        const FormFieldSpec(name: 'name', label: 'Nama lengkap', required: true, half: true, maxLength: 60, placeholder: 'cth: Budi Kasir'),
        FormFieldSpec(name: 'username', label: 'Username', required: true, half: true, maxLength: 24, placeholder: '${awalan}budi', hint: '3-24 karakter: huruf kecil, angka, titik, underscore. Awali dengan kode client.'),
        const FormFieldSpec(name: 'password', label: 'Password', type: FieldType.password, required: true, half: true, maxLength: 128, hint: 'Minimal 8 karakter, mengandung huruf dan angka.'),
        const FormFieldSpec(name: 'role', label: 'Peran', type: FieldType.select, half: true, options: [Option('cashier', 'Kasir'), Option('admin', 'Admin (boleh mengurus akun client sendiri)')]),
      ],
      values: {'client': clientTerpilih, 'tenant': opsiCabang.isEmpty ? '' : opsiCabang.first.value, 'role': 'cashier', 'username': awalan},
      onSubmit: (v) async {
        final username = v['username'].toString().toLowerCase();
        final nama = v['name'].toString();
        final password = v['password'].toString();
        final tenant = v['tenant'].toString();

        final masalah = validateNewAccount(username, password, tenant);
        if (masalah != null) return SubmitFail(masalah);

        final terpakai = await deps.profiles.isUsernameTaken(username);
        if (terpakai case Err(:final error)) return SubmitFail(pesanError(error));
        if ((terpakai as Ok<bool>).data) return const SubmitFail('Username sudah dipakai. Pakai nama lain.');

        final daftar = await deps.authRepo.signUpDetached('$username@${AppConfig.emailDomain}', password);
        if (daftar case Err(:final error)) {
          if (error.code == 'user_already_exists' || error.status == 422 || RegExp('duplicate|already|sudah', caseSensitive: false).hasMatch(error.message)) {
            return const SubmitFail('Username ini sudah pernah dipakai di sistem autentikasi. Pakai nama lain.');
          }
          return SubmitFail(pesanError(error));
        }

        final profil = await deps.profiles.create(id: (daftar as Ok<String>).data, username: username, name: nama, role: _role(v['role']), avatar: initialOf(nama), tenantId: tenant);
        if (profil case Err(:final error)) return SubmitFail(pesanError(error));

        deps.toast.show('Akun "$username" dibuat. Client bisa login ke POS memakai username itu.', type: ToastType.success, duration: const Duration(seconds: 7));
        deps.reload.reload();
        return const SubmitOk();
      },
    ));
  }

  Future<void> ubah(Profile baris) => deps.dialog.form(FormSpec(
        title: 'Ubah akun @${baris.username}',
        note: 'Username (dipakai untuk login) tidak dapat diubah. Bila perlu username baru, buat akun baru lalu hapus yang lama.',
        submitText: 'Simpan perubahan',
        fields: [
          const FormFieldSpec(name: 'name', label: 'Nama lengkap', required: true, maxLength: 60),
          const FormFieldSpec(name: 'role', label: 'Peran', type: FieldType.select, half: true, options: [Option('cashier', 'Kasir'), Option('admin', 'Admin')]),
          FormFieldSpec(name: 'tenant', label: 'Cabang', type: FieldType.select, half: true, required: true, options: deps.lookups.api.tenantOptions()),
        ],
        values: {'name': baris.name, 'role': baris.role, 'tenant': baris.tenantId},
        onSubmit: (v) async {
          final hasil = await deps.profiles.update(baris.id, name: v['name'].toString(), role: _role(v['role']), tenantId: v['tenant'].toString());
          if (hasil case Err(:final error)) return SubmitFail(pesanError(error));
          deps.toast.show('Akun diperbarui.', type: ToastType.success);
          deps.reload.reload();
          return const SubmitOk();
        },
      ));

  Future<void> hapus(Profile baris) async {
    final yakin = await deps.dialog.confirmDelete('Hapus akun', 'Hapus akun @${baris.username}? Akun tidak bisa login lagi dan username-nya bisa dipakai ulang. Riwayat transaksi lama tetap tersimpan.');
    if (!yakin) return;
    final hasil = await deps.profiles.deleteByUsername(baris.username);
    if (hasil case Err(:final error)) return deps.toast.show(pesanError(error), type: ToastType.danger, duration: const Duration(seconds: 8));
    deps.toast.show('Akun @${baris.username} dihapus.', type: ToastType.success);
    deps.reload.reload();
  }
}
