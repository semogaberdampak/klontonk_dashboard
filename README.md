# Klontonk Dashboard

Dashboard manajemen untuk **Klontonk POS**: mengelola client (pelanggan berlangganan),
cabang, langganan, akun pengguna, dan **melihat log** aplikasi POS yang dipakai client.

Aplikasi ini adalah **control plane**: tempat Anda (vendor) mengurus langganan dan memantau,
sedangkan aplikasi POS (`klontonk_pos`) tetap menjadi **data plane** tempat client bekerja.
Keduanya memakai **satu database Supabase yang sama** (multi-tenant).

```
        +-------------------------------------------+
        |  KLONTONK DASHBOARD  (repo ini)           |   <-- Anda (admin platform)
        |  client - cabang - langganan - log        |
        +----------------------+--------------------+
                               | publishable key + RLS
        +----------------------v--------------------+
        |  SUPABASE (1 project)                      |
        |  clients - tenants - profiles              |
        |  plans - subscriptions                     |
        |  audit_logs - client_events                |
        +----------------------^--------------------+
                               | publishable key + RLS
        +----------------------+--------------------+
        |  KLONTONK POS  (repo klontonk_pos)         |   <-- admin client & kasir
        +-------------------------------------------+
```

## Kenapa multi-tenant (satu database)

Keputusan ini diambil setelah menghitung biaya, risiko, dan beban operasional:

| | 1 database bersama (dipakai) | 1 project Supabase per client |
|---|---|---|
| Biaya pada 50 outlet | ~Rp 413.000/bln (1 paket Pro) | ~Rp 8.500.000/bln (50 x compute $10) |
| Melihat log semua client | dari satu tempat | harus buka 50 dashboard |
| Migrasi skema | 1 kali | 50 kali manual |
| Isolasi antar client | RLS (diuji otomatis, lihat `db/verify-rls.sql`) | terpisah fisik |
| Risiko utama | 1 kesalahan RLS berdampak ke semua client | salah konfigurasi berulang di banyak project |

Rincian lengkapnya, termasuk angka margin dan syarat wajib sebelum client berbayar pertama,
ada di komentar bagian atas `db/dashboard-schema.sql`.

## Struktur berkas

```
index.html            app shell (sidebar, topbar, modal, toast)
manifest.json  sw.js  PWA: bisa dibuka saat offline
nginx.conf  compose.yaml  cara menjalankan secara lokal
css/styles.css        tema dashboard (desktop: tabel lebar + filter)
js/config.js          URL + publishable key Supabase, versi aplikasi
js/supabase.js        klien REST/Auth ringan (tanpa pustaka) + paginasi + pesan error
js/auth.js            login admin platform (email + password)
js/router.js          router hash + kontrak halaman { render, init, act }
js/ui.js              toast, modal, form-modal generik, tabel, paginasi, query PostgREST
js/format.js          rupiah, tanggal Asia/Jakarta, rincian log, ekspor CSV
js/lookups.js         daftar acuan (client, paket, cabang) untuk dropdown
js/pages/*.js         13 halaman (lihat tabel di bawah)
db/dashboard-schema.sql   SKEMA: tabel baru, trigger log, gate langganan, RLS, RPC
db/verify.sql             uji struktur + isolasi + keamanan (jalankan setelah skema)
db/verify-rls.sql         uji RLS sesungguhnya sebagai peran authenticated
db/seed-demo.sql          data contoh (opsional) untuk mencoba tampilan
```

### Halaman

| Menu | Fungsi |
|---|---|
| Ringkasan | Kartu angka seluruh client, daftar "perlu perhatian", aktivitas & error terbaru |
| Pemakaian | Aktivitas harian per client (transaksi, omzet, retur, log, error) |
| Klien | CRUD client (pemilik langganan) + status aktif/suspend/berhenti |
| Cabang | CRUD cabang (tenant) milik client |
| Langganan | Riwayat langganan, perpanjang, ubah paket, sinkronkan status jatuh tempo |
| Paket | CRUD paket (harga + batas cabang/pengguna) |
| Akun client | Buat/ubah/hapus akun admin & kasir milik client |
| Transaksi | Riwayat penjualan seluruh cabang (baca saja) + ekspor CSV |
| Retur | Riwayat retur barang (baca saja) + ekspor CSV |
| Log audit | Siapa mengubah apa, kapan -- dari trigger database |
| Log teknis | Error/peringatan dari perangkat client |
| Pengaturan | Info sistem, kuota data, pemangkas log, cache aplikasi |

## Pasang sekali

1. **Pakai project Supabase yang sama dengan Klontonk POS** (jangan buat project baru:
   Free plan hanya mengizinkan 2 project, dan data client harus berada di satu tempat).
2. Authentication -> Providers -> Email: **matikan "Confirm email"**.
   Wajib: akun client dibuat dengan email `<username>@klontonk.local` yang tidak bisa menerima
   surat konfirmasi. Bila fitur ini menyala, akun baru tidak akan pernah bisa login.
3. Authentication -> Users -> **Add user**: email admin platform Anda + password kuat.
4. SQL Editor -> tempel **`db/dashboard-schema.sql`** -> Run. Aman diulang.
5. Daftarkan akun langkah 3 sebagai superadmin (ganti emailnya):

   ```sql
   INSERT INTO public.platform_admins (id, name)
   SELECT id, 'Nama Anda' FROM auth.users WHERE email = 'admin@contoh.com';
   ```

6. SQL Editor -> jalankan **`db/verify.sql`** lalu **`db/verify-rls.sql`**.
   Semua baris hasil harus **PASS**; `verify-rls.sql` sendiri tidak menampilkan error bila lolos.
7. Selesai. Langkah berikutnya: Jalankan aplikasi (bagian di bawah) dan login.## Menjalankan aplikasi

Tanpa build tool apa pun -- cukup berkas statis.

```bash
podman compose up -d      # -> http://localhost:8081  (POS memakai 8080, bisa jalan bersama)
```

Bila `podman` belum ada di komputer ini, dua alternatif yang sama baiknya:

- VS Code **Live Server** (klik kanan `index.html` -> Open with Live Server); CSP di `index.html`
  sudah memuat hash skrip Live Server supaya pengembangan lokal tidak terblokir.
- GitHub Pages / Cloudflare Pages / Netlify: unggah repo ini apa adanya (gratis), lalu arahkan
  subdomain, mis. `dashboard.domain-anda.com`.

Setelah dibuka, login dengan **email + password** admin platform (bagian "Pasang sekali" langkah 3-5).

## Alur pakai harian

Urutan yang disarankan saat menambah client baru:

1. **Paket** -- pastikan paket (harga + batas cabang/pengguna) sudah ada.
2. **Klien -> Tambah client** -- client + langganan trial dibuat sekaligus dalam satu transaksi.
3. **Cabang -> Tambah cabang** -- ID cabang (T00x) dibuat otomatis; jumlahnya dibatasi paket.
4. **Akun client -> Buat akun** -- akun langsung bisa dipakai login ke POS memakai **username**.
5. Pasang aplikasi POS di perangkat client, lalu login dengan akun tersebut.
6. **Log audit** dan **Log teknis** mulai terisi; **Ringkasan** menampilkan kondisi client.

Catatan penting soal langganan: yang benar-benar mengunci POS adalah **trigger di database**.
Saat langganan kedaluwarsa, POS masih bisa dibuka dan data lama masih bisa dibaca, tetapi
**transaksi/retur baru ditolak** dengan pesan yang jelas. Karena itu, memperpanjang langganan di
halaman **Langganan** langsung berpengaruh pada client.

## Apa yang dicatat sebagai log

Log bisnis diisi **trigger database**, jadi tidak bisa dilewati aplikasi dan tidak bergantung
pada kedisiplinan kode di POS:

| Aksi | Sumber | Isi rincian |
|---|---|---|
| `stock.create` / `stock.update` / `stock.delete` | trigger `stock_items` | nama, jumlah, satuan, harga, barcode (khusus ubah: nilai **sebelum -> sesudah**) |
| `price.update` | trigger `stock_items` | harga lama -> harga baru |
| `sale.checkout` | trigger `sales` | total, dibayar, metode, kasir |
| `return.process` | trigger `stock_returns` | jenis, barang, jumlah, nilai, alasan |
| `user.create` / `user.update` / `user.delete` | trigger `profiles` | username, nama, peran, cabang |
| `client.*` / `branch.*` / `plan.*` / `subscription.*` | trigger tabel platform | isi baris sebelum -> sesudah |
| `auth.login` | `rpc('log_event')` dari POS (**belum dipasang**) | lihat bagian Integrasi POS |
| Log teknis (error perangkat) | `rpc('report_event')` dari POS (**belum dipasang**) | pesan, konteks, versi aplikasi, perangkat |

## Keamanan

- **Tidak ada kunci rahasia di repo ini.** Aplikasi memakai publishable key (memang publik).
  Keamanan sepenuhnya bergantung pada RLS di database -- pola yang sama dengan `klontonk_pos`.
  Jangan pernah menaruh kunci `secret` / `service_role` di berkas mana pun yang disajikan ke browser.
- **Isolasi antar client sudah diperketat.** Sebelum dashboard ini dipasang, `can_access_tenant()`
  menganggap peran `admin` sebagai admin global -- artinya admin client A bisa membaca (dan karena
  `GRANT DELETE` pada `stock_items` masih berlaku) menghapus data client B. Sekarang admin client
  hanya bisa mengakses tenant milik clientnya sendiri. Perilaku pada data lama tidak berubah karena
  semua cabang lama dipindahkan ke satu client bawaan `C0001`.
- **`delete_app_user()` milik POS diganti** dengan versi yang menambahkan batas client. Bila
  `db/schema.sql` di repo POS diubah, sinkronkan kembali bagian 16 di `db/dashboard-schema.sql`.
- **`audit_logs` bersifat append-only.** Hak `INSERT`/`UPDATE`/`DELETE` dicabut dari peran
  `authenticated`; baris hanya lahir dari fungsi trigger `SECURITY DEFINER`. Client tidak bisa
  memalsukan atau menghapus jejak audit.
- **`platform_admins` tidak punya policy tulis.** Tidak ada cara mempromosikan diri menjadi
  superadmin lewat API -- hanya lewat SQL Editor.
- **`tenants` hanya bisa diubah superadmin**, karena perubahan cabang adalah batas komersial.
- Password tidak pernah disimpan di aplikasi; hash dikelola Supabase Auth.
## Integrasi POS (belum dipasang)

Dashboard ini sudah berfungsi tanpa mengubah satu baris pun di `klontonk_pos`. Log perubahan
data (stok, harga, penjualan, retur, akun) sudah tercatat otomatis oleh trigger database.

Yang belum ada hanya dua hal, keduanya butuh perubahan kecil di repo POS:

1. **Log login** -- di `klontonk_pos/js/auth.js`, setelah profil berhasil dimuat saat login:

   ```js
   import { rest, rpc, signIn } from './supabase.js';   // tambahkan rpc
   // ... setelah profil ditemukan:
   rpc('log_event', { p_action: 'auth.login', p_detail: { version: APP_VERSION } });
   ```

2. **Laporan error perangkat** -- berkas baru `klontonk_pos/js/telemetry.js`:

   ```js
   import { rpc } from './supabase.js';

   // Best-effort: tidak boleh mengganggu kasir, jadi semua kegagalan diabaikan.
   export function reportEvent(level, source, message, context = {}) {
     rpc('report_event', {
       p_level: level, p_source: source, p_message: String(message).slice(0, 500),
       p_context: context, p_app_version: APP_VERSION
     }).catch(() => {});
   }

   window.addEventListener('error', (e) => reportEvent('error', 'window', e.message));
   window.addEventListener('unhandledrejection', (e) => reportEvent('error', 'promise', String(e.reason)));
   ```

   Lalu panggil dari `StockStore.onSaveError(...)` yang sudah ada di `klontonk_pos/js/app.js`.
   Jangan lupa menaikkan `CACHE_NAME` di `sw.js` dan `?v=` di `index.html` saat merilis POS.

Setelah dua langkah itu, halaman **Log teknis** terisi sendiri dan Anda bisa tahu masalah
client sebelum mereka menelepon.

## Rutinitas pada Free plan

- **Kuota 500 MB.** Pantau di **Pengaturan -> Kuota data terpakai**, lalu jalankan
  **Pangkas log lama** secara berkala (mis. tiap bulan).
- **Proyek Free di-pause bila tidak ada aktivitas selama 1 minggu.** Selama POS dipakai setiap
  hari risikonya kecil; yang perlu diwaspadai adalah libur panjang saat semua client tutup.
  Membuka dashboard cukup untuk menghitung sebagai aktivitas.
- **Retensi log platform hanya 1 hari**, karena itu dashboard menyimpan lognya sendiri
  (`audit_logs`, `client_events`). Membaca log bawaan Supabase (Auth/Postgres) butuh kunci
  rahasia di sisi server -> ditunda sampai naik ke Pro + Edge Function.
- **Maksimal 2 project.** Untuk menguji perubahan skema, pakai project dev yang sudah ada;
  jangan mengorbankan project produksi.

## Rilis versi baru

1. Ubah `APP_VERSION` di `js/config.js`.
2. Naikkan `CACHE_NAME` di `sw.js` (mis. `klontonk-dashboard-v2`).
3. Naikkan `?v=` pada tag `<script src="js/app.js?v=...">` di `index.html`.
4. Unggah / hidupkan ulang. Perangkat akan mengambil versi baru (strategi network-first).

Tombol **Pengaturan -> Bersihkan cache aplikasi** (atau membuka `index.html?reset-cache=1`)
berguna bila tampilan tertahan di versi lama.

## Pengujian

- **Sintaks & impor JS (tanpa build tool):** salin `js/**/*.js` menjadi `.mjs` lalu `node --check`.
  Seluruh berkas sudah lolos, dan setiap `import` sudah dicocokkan dengan `export` tujuan.
- **Struktur & isolasi database:** `db/verify.sql` -- 16 pemeriksaan (tabel, RLS aktif,
  append-only, trigger terpasang, gate langganan, dan admin client tidak bisa mengakses cabang
  client lain). Skrip berjalan di dalam transaksi yang di-ROLLBACK, jadi data asli aman.
- **RLS sesungguhnya:** `db/verify-rls.sql` menjalankan permintaan sebagai peran `authenticated`
  dengan klaim pengguna uji, sehingga policy benar-benar dievaluasi Postgres.
- **Checklist di browser:** login -> Ringkasan menampilkan angka -> tambah paket -> tambah client
  (trial) -> tambah cabang -> buat akun -> login ke POS client itu dengan akun tersebut ->
  lakukan satu penjualan -> periksa halaman Log audit dan Pemakaian.

## Roadmap berikutnya

1. Pasang integrasi POS (log login + telemetry) seperti di atas.
2. Naikkan ke **Pro**: backup harian, retensi log 7 hari, dan 1 project tambahan untuk menguji migrasi.
3. Edge Function: pengingat jatuh tempo otomatis (WhatsApp/email) dan pembacaan log platform Supabase.
4. Ekspor/backup logis **per client** terjadwal -- menutup satu-satunya kekurangan model 1 database.
5. pgTAP (`supabase test db`) untuk uji RLS otomatis berkelanjutan bila Supabase CLI dipasang.
6. Halaman pengumuman: menetapkan versi aplikasi POS minimal yang wajib dipakai client.

## Batasan yang diketahui

- **Username unik global.** Selalu pakai awalan kode client (`c0001.budi`); form pembuatan akun
  sudah menyarankan format ini.
- **Maksimal 999 cabang.** Format ID `T###` adalah bawaan `klontonk_pos` (validasi `/^T\d{3}$/`
  di `js/auth.js`). Melebarkannya butuh perubahan di kedua repo, jadi belum dilakukan.
- **Restore granular belum ada.** Backup Supabase berlaku per project, sehingga "kembalikan data
  client X ke 3 hari lalu" tidak bisa tanpa memutar balik semuanya. Penutupnya: `audit_logs`
  menyimpan nilai sebelum -> sesudah sehingga data bisa direkonstruksi, dan disarankan mengekspor
  logis per client secara berkala.
- **`v_client_overview` menghitung agregat sebelum difilter.** Pada skala puluhan-ratusan client
  ini cepat; bila sudah ribuan, ganti dengan RPC berparameter.
- **Transaksi & Retur memang baca saja.** Satu-satunya cara sah mencatat penjualan adalah lewat
  kasir di POS (`checkout()`), supaya stok dan struk tetap konsisten.
- **Halaman Log teknis kosong** sampai integrasi POS dipasang.