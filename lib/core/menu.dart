/// Peta menu: satu sumber untuk sidebar, judul halaman, dan rute.
class AppRoute {
  const AppRoute({required this.path, required this.label, required this.group, required this.title, required this.subtitle});

  final String path;
  final String label;
  final String group;
  final String title;
  final String subtitle;
}

const defaultPath = '/ringkasan';

const appRoutes = <AppRoute>[
  AppRoute(path: '/ringkasan', label: 'Ringkasan', group: 'Pemantauan', title: 'Ringkasan', subtitle: 'Kondisi seluruh client dalam satu layar.'),
  AppRoute(path: '/pemakaian', label: 'Pemakaian', group: 'Pemantauan', title: 'Pemakaian', subtitle: 'Aktivitas harian per client: transaksi, retur, log, dan error.'),
  AppRoute(path: '/klien', label: 'Klien', group: 'Klien', title: 'Klien', subtitle: 'Pelanggan berlangganan -- pemilik satu atau beberapa cabang.'),
  AppRoute(path: '/cabang', label: 'Cabang', group: 'Klien', title: 'Cabang', subtitle: 'Cabang (tenant) milik setiap client.'),
  AppRoute(path: '/langganan', label: 'Langganan', group: 'Langganan', title: 'Langganan', subtitle: 'Masa berlaku dan status paket setiap client.'),
  AppRoute(path: '/paket', label: 'Paket', group: 'Langganan', title: 'Paket', subtitle: 'Harga dan batas jumlah cabang/pengguna.'),
  AppRoute(path: '/pengguna', label: 'Akun client', group: 'Pengguna', title: 'Akun client', subtitle: 'Akun admin dan kasir milik client.'),
  AppRoute(path: '/transaksi', label: 'Transaksi', group: 'Data client (baca saja)', title: 'Transaksi', subtitle: 'Riwayat penjualan seluruh cabang (baca saja).'),
  AppRoute(path: '/retur', label: 'Retur', group: 'Data client (baca saja)', title: 'Retur', subtitle: 'Riwayat retur barang seluruh cabang (baca saja).'),
  AppRoute(path: '/log-audit', label: 'Log audit', group: 'Log', title: 'Log audit', subtitle: 'Siapa mengubah apa dan kapan -- dicatat otomatis oleh database.'),
  AppRoute(path: '/log-teknis', label: 'Log teknis', group: 'Log', title: 'Log teknis', subtitle: 'Error/peringatan yang dikirim aplikasi POS di perangkat client.'),
  AppRoute(path: '/pengaturan', label: 'Pengaturan', group: 'Sistem', title: 'Pengaturan', subtitle: 'Informasi sistem, retensi log, dan cache aplikasi.'),
];

/// Menu sisi, dikelompokkan sesuai urutan [appRoutes].
Map<String, List<AppRoute>> get navGroups {
  final hasil = <String, List<AppRoute>>{};
  for (final route in appRoutes) {
    hasil.putIfAbsent(route.group, () => []).add(route);
  }
  return hasil;
}

AppRoute? routeFor(String path) {
  for (final route in appRoutes) {
    if (route.path == path) return route;
  }
  return null;
}
