-- ============================================================================
-- Klontonk Dashboard - DATA CONTOH (opsional)
-- ----------------------------------------------------------------------------
-- Gunakan bila ingin melihat halaman Klien / Cabang / Langganan berisi data sebelum
-- client sungguhan ada. Sifatnya opsional dan mudah dibersihkan.
--
-- ID yang dipakai (C8001, T801) sengaja BERBEDA dari ID data uji di db/verify.sql
-- (C9001, T901) supaya kedua berkas tidak saling mengganggu bila dijalankan berdua.
--
-- Cara menghapus kembali:
--   DELETE FROM public.tenants       WHERE client_id = 'C8001';
--   DELETE FROM public.subscriptions WHERE client_id = 'C8001';
--   DELETE FROM public.clients       WHERE id = 'C8001';
--   DELETE FROM public.plans         WHERE code IN ('umkm_basic', 'umkm_pro', 'umkm_max');
-- (baris log audit tetap ada dengan sendirinya -- memang begitu cara kerja log.)
-- ============================================================================

BEGIN;

-- 1. Tiga paket UMKM yang realistis.
INSERT INTO public.plans (code, name, price_month, max_branches, max_users, is_active, note) VALUES
  ('umkm_basic', 'UMKM Basic',  50000, 1,  3, true, '1 cabang, 3 pengguna.'),
  ('umkm_pro',   'UMKM Pro',   100000, 3,  8, true, '3 cabang, 8 pengguna.'),
  ('umkm_max',   'UMKM Max',   175000, 10, 25, true, '10 cabang, 25 pengguna.')
ON CONFLICT (code) DO NOTHING;

-- 2. Client contoh dengan trial yang berakhir 7 hari lagi, supaya kartu
--    "perlu perhatian" di halaman Ringkasan ikut terlihat.
INSERT INTO public.clients (id, name, contact_name, contact_phone, note)
VALUES ('C8001', 'Warung Contoh', 'Bu Sari', '081200000001', 'Data contoh untuk uji tampilan dashboard.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscriptions (client_id, plan_code, started_at, expires_at, status, note)
SELECT 'C8001', 'umkm_pro',
       (now() AT TIME ZONE 'Asia/Jakarta')::date - 23,
       (now() AT TIME ZONE 'Asia/Jakarta')::date + 7,
       'trial', 'Trial 30 hari (contoh).'
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE client_id = 'C8001');

-- 3. Satu cabang contoh (jumlahnya dibatasi paket -> paket Pro mengizinkan 3).
INSERT INTO public.tenants (id, name, client_id)
VALUES ('T801', 'Cabang Contoh', 'C8001')
ON CONFLICT (id) DO NOTHING;

COMMIT;