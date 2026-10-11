// Peta menu: satu sumber untuk sidebar, judul halaman, dan judul tab browser.

export interface AppRoute {
  path: string
  label: string
  group: string
  title: string
  subtitle: string
}

export const DEFAULT_PATH = '/ringkasan'

export const ROUTES: readonly AppRoute[] = [
  { path: '/ringkasan', label: 'Ringkasan', group: 'Pemantauan', title: 'Ringkasan', subtitle: 'Kondisi seluruh client dalam satu layar.' },
  { path: '/pemakaian', label: 'Pemakaian', group: 'Pemantauan', title: 'Pemakaian', subtitle: 'Aktivitas harian per client: transaksi, retur, log, dan error.' },
  { path: '/klien', label: 'Klien', group: 'Klien', title: 'Klien', subtitle: 'Pelanggan berlangganan -- pemilik satu atau beberapa cabang.' },
  { path: '/cabang', label: 'Cabang', group: 'Klien', title: 'Cabang', subtitle: 'Cabang (tenant) milik setiap client.' },
  { path: '/langganan', label: 'Langganan', group: 'Langganan', title: 'Langganan', subtitle: 'Masa berlaku dan status paket setiap client.' },
  { path: '/paket', label: 'Paket', group: 'Langganan', title: 'Paket', subtitle: 'Harga dan batas jumlah cabang/pengguna.' },
  { path: '/pengguna', label: 'Akun client', group: 'Pengguna', title: 'Akun client', subtitle: 'Akun admin dan kasir milik client.' },
  { path: '/transaksi', label: 'Transaksi', group: 'Data client (baca saja)', title: 'Transaksi', subtitle: 'Riwayat penjualan seluruh cabang (baca saja).' },
  { path: '/retur', label: 'Retur', group: 'Data client (baca saja)', title: 'Retur', subtitle: 'Riwayat retur barang seluruh cabang (baca saja).' },
  { path: '/log-audit', label: 'Log audit', group: 'Log', title: 'Log audit', subtitle: 'Siapa mengubah apa dan kapan -- dicatat otomatis oleh database.' },
  { path: '/log-teknis', label: 'Log teknis', group: 'Log', title: 'Log teknis', subtitle: 'Error/peringatan yang dikirim aplikasi POS di perangkat client.' },
  { path: '/pengaturan', label: 'Pengaturan', group: 'Sistem', title: 'Pengaturan', subtitle: 'Informasi sistem, retensi log, dan cache aplikasi.' }
]

export interface NavGroup {
  name: string
  routes: AppRoute[]
}

/** Menu sisi, dikelompokkan sesuai urutan ROUTES. */
export const NAV_GROUPS: readonly NavGroup[] = ROUTES.reduce<NavGroup[]>((groups, route) => {
  const existing = groups.find((g) => g.name === route.group)
  if (existing) return groups.map((g) => (g === existing ? { ...g, routes: [...g.routes, route] } : g))
  return [...groups, { name: route.group, routes: [route] }]
}, [])

export const routeFor = (path: string): AppRoute | undefined => ROUTES.find((r) => r.path === path)
