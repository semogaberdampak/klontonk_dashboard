# Klontonk Dashboard

Dashboard admin platform untuk mengelola client (tenant) Klontonk POS: client, cabang, langganan, paket, akun, transaksi/retur (baca saja), log audit, dan log teknis. Data dan login memakai project Supabase yang sama dengan `klontonk_pos`.

Teknologi: **Flutter (web)** dengan pola **MVVM**.

## Arsitektur MVVM

```
lib/
├── main.dart            composition root: merakit repository, layanan, ViewModel global
├── app/app.dart         MaterialApp.router, GoRouter (redirect login), Provider
├── core/                config, format, tanggal, CSV, Result<T>/AppError, peta menu
├── data/
│   ├── models/          Model: bentuk data dari PostgREST
│   ├── repositories/    Model: akses Supabase, mengembalikan Result<T>
│   └── demo/            DemoHttpClient: PostgREST palsu untuk mode demo
├── services/            Toast, Dialog, Reload (dipakai ViewModel tanpa BuildContext)
├── viewmodels/          ViewModel (ChangeNotifier): state, filter dari URL, aksi tulis
└── views/               View: tema, widget bersama, kerangka, login, 12 halaman
```

Aliran: `View` -> `ViewModel` -> `Repository` -> Supabase. View hanya menampilkan state dan memanggil aksi; tidak ada akses data di View. Filter disimpan di URL (`#/transaksi?client=...`), halaman dibuat ulang saat URL berubah. Keamanan data dijaga RLS di database (`db/dashboard-schema.sql`), bukan oleh aplikasi.

## Menjalankan (Podman)

```bash
podman compose up -d --build     # http://localhost:8081
podman compose down
```

`compose.yaml` membangun dengan `DEMO_MODE=true` (data contoh, tanpa login). Ubah ke `"false"` untuk terhubung ke Supabase (butuh skema dari `db/dashboard-schema.sql`; login memakai email + password akun di tabel `platform_admins`).

Konfigurasi opsional lewat build-arg / `--dart-define`: `SUPABASE_URL`, `SUPABASE_KEY` (kunci publishable saja, jangan secret/service_role), `DEMO_MODE`.

## Tanpa Podman

```bash
flutter pub get
flutter run -d chrome --dart-define=DEMO_MODE=true
flutter analyze
```

## Catatan

- Unit test belum dibuat (ditunda sampai konversi ke Flutter selesai).
- Flutter web mengunduh CanvasKit dan font Roboto dari gstatic.com saat pertama dibuka.
