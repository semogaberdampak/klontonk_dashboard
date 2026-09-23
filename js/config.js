// Pengaturan koneksi Supabase untuk Klontonk Dashboard.
//
// Kedua nilai di bawah PUBLIK dan memang untuk dipasang di aplikasi web: keamanan data
// dijaga oleh RLS di database (db/dashboard-schema.sql), bukan oleh kerahasiaan kunci ini.
// JANGAN pernah menaruh kunci "secret" / "service_role" di sini atau di berkas mana pun di repo.
//
// Dashboard memakai PROJECT YANG SAMA dengan Klontonk POS (satu database multi-tenant),
// supaya log dan langganan semua client bisa dipantau dari satu tempat.
export const SUPABASE_URL = 'https://bxynoilzdiqjiepdewnp.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_biqV-ZAK0T0B43KKyoQgSw_VOjb-GhC';

// Versi aplikasi -- naikkan bersama CACHE_NAME di sw.js dan ?v= di index.html.
export const APP_VERSION = '1.0.0';

// Jumlah baris per halaman tabel.
export const PAGE_SIZE = 50;

// Saran format username akun client: <kode client huruf kecil>.<nama>
// (username bersifat unik GLOBAL di database, jadi awalan kode client mencegah tabrakan).
export const USERNAME_SUGGEST = 'c0001.nama';
// Domain email internal. Supabase Auth memerlukan email, sedangkan kasir login memakai
// username -- jadi akun client dibuat dengan email <username>@klontonk.local.
// NILAI INI HARUS SAMA dengan EMAIL_DOMAIN di klontonk_pos/js/config.js, kalau berbeda
// maka akun yang dibuat di sini tidak bisa dipakai login di aplikasi POS.
export const EMAIL_DOMAIN = 'klontonk.local';