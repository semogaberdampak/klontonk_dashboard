-- ============================================================================
-- Klontonk Dashboard - UJI RLS SESUNGGUHNYA
-- Berbeda dari db/verify.sql (yang memeriksa struktur & predikat), berkas ini
-- menjalankan permintaan SEBAGAI peran `authenticated` dengan klaim pengguna uji,
-- jadi policy RLS benar-benar dievaluasi oleh Postgres.
--
-- Cara pakai: Supabase -> SQL Editor -> tempel SELURUH berkas -> Run.
-- Semua perubahan dibatalkan (ROLLBACK) -- data asli aman.
--
-- Cara membaca hasil: semua baris harus PASS. Selain itu ada satu pemeriksaan
-- tambahan (blok terakhir): bila skrip selesai TANPA error, berarti lolos.
-- ============================================================================
BEGIN;

-- ---------- data uji sementara (dibuat sebagai postgres, jadi RLS dilewati) ----------
INSERT INTO public.clients (id, name) VALUES ('C9002', 'Uji RLS (sementara)');
INSERT INTO public.plans (code, name, price_month, max_branches, max_users, is_active)
  VALUES ('uji_rls', 'Paket Uji RLS', 0, 99, 99, true);
INSERT INTO public.subscriptions (client_id, plan_code, started_at, expires_at, status)
  VALUES ('C9002', 'uji_rls', current_date, current_date + 30, 'aktif');
INSERT INTO public.tenants (id, name, client_id) VALUES ('T902', 'Cabang Uji RLS', 'C9002');
INSERT INTO public.stock_items (tenant_id, id, name, qty, unit, price)
  VALUES ('T902', 'stk_uji_1', 'Barang Uji', 5, 'pcs', 1000);
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-00000000c902', '00000000-0000-0000-0000-000000000000',
          'authenticated', 'authenticated', 'uji.rls@klontonk.local', 'x', now(), now(), now());
INSERT INTO public.profiles (id, username, name, role, avatar, tenant_id)
  VALUES ('00000000-0000-0000-0000-00000000c902', 'uji_rls', 'Admin Uji RLS', 'admin', 'U', 'T902');

-- ---------- masuk sebagai pengguna uji ----------
SELECT set_config('request.jwt.claims',
                  '{"sub":"00000000-0000-0000-0000-00000000c902","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c902', true);
SET LOCAL ROLE authenticated;

-- ---------- hasil (dijalankan sebagai authenticated) ----------
SELECT no AS "No", uji AS "Uji RLS", hasil AS "Hasil"
FROM (VALUES
  (1, 'Tabel clients: hanya client sendiri yang terlihat',
      CASE WHEN (SELECT count(*) FROM public.clients) = 1
             AND (SELECT count(*) FROM public.clients WHERE id = 'C0001') = 0
           THEN 'PASS' ELSE 'FAIL' END),
  (2, 'Tabel tenants: hanya cabang sendiri yang terlihat',
      CASE WHEN (SELECT count(*) FROM public.tenants) = 1
             AND (SELECT count(*) FROM public.tenants WHERE id = 'T001') = 0
           THEN 'PASS' ELSE 'FAIL' END),
  (3, 'Stok client lain tidak terbaca',
      CASE WHEN (SELECT count(*) FROM public.stock_items WHERE tenant_id = 'T001') = 0
           THEN 'PASS' ELSE 'FAIL' END),
  (4, 'Stok milik sendiri tetap terbaca',
      CASE WHEN (SELECT count(*) FROM public.stock_items WHERE tenant_id = 'T902') = 1
           THEN 'PASS' ELSE 'FAIL' END),
  (5, 'Penjualan client lain tidak terbaca',
      CASE WHEN (SELECT count(*) FROM public.sales WHERE tenant_id = 'T001') = 0
           THEN 'PASS' ELSE 'FAIL' END),
  (6, 'Retur client lain tidak terbaca',
      CASE WHEN (SELECT count(*) FROM public.stock_returns WHERE tenant_id = 'T001') = 0
           THEN 'PASS' ELSE 'FAIL' END),
  (7, 'Log audit client lain tidak terbaca',
      CASE WHEN (SELECT count(*) FROM public.audit_logs WHERE client_id = 'C0001') = 0
           THEN 'PASS' ELSE 'FAIL' END),
  (8, 'Log audit milik sendiri terbaca (trigger audit bekerja)',
      CASE WHEN (SELECT count(*) FROM public.audit_logs WHERE client_id = 'C9002') > 0
           THEN 'PASS' ELSE 'FAIL' END),
  (9, 'Langganan client lain tidak terbaca',
      CASE WHEN (SELECT count(*) FROM public.subscriptions WHERE client_id = 'C0001') = 0
           THEN 'PASS' ELSE 'FAIL' END),
  (10,'Daftar admin platform tidak terbaca',
      CASE WHEN (SELECT count(*) FROM public.platform_admins) = 0
           THEN 'PASS' ELSE 'FAIL' END),
  (11,'Tabel profiles: hanya akun satu client yang terlihat',
      CASE WHEN (SELECT count(*) FROM public.profiles) = 1
           THEN 'PASS' ELSE 'FAIL' END),
  (12,'Hak tulis ke log audit tidak diberikan (append-only)',
      CASE WHEN NOT has_table_privilege('public.audit_logs', 'UPDATE')
             AND NOT has_table_privilege('public.audit_logs', 'DELETE')
           THEN 'PASS' ELSE 'FAIL' END),
  (13,'MENGUBAH stok client lain ditolak (0 baris berubah)',
      CASE WHEN (WITH upd AS (UPDATE public.stock_items SET qty = qty WHERE tenant_id = 'T001' RETURNING 1)
                SELECT count(*) FROM upd) = 0
           THEN 'PASS' ELSE 'FAIL' END)
) AS t(no, uji, hasil)
ORDER BY no;

-- ---------- pemeriksaan terakhir: membuat cabang baru HARUS ditolak ----------
-- (Tidak bisa ditampilkan sebagai baris tabel karena pelanggaran RLS pada INSERT
--  memunculkan error, bukan 0 baris. Jadi: skrip selesai tanpa error = lolos.)
DO $$
BEGIN
  BEGIN
    INSERT INTO public.tenants (id, name, client_id) VALUES ('T903', 'Cabang Tidak Boleh', 'C9002');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RETURN;  -- ditolak: sesuai harapan
  END;
  RAISE EXCEPTION 'GAGAL: admin client berhasil menambah cabang sendiri (harus ditolak superadmin).';
END $$;

ROLLBACK;