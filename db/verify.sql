-- ============================================================================
-- Klontonk Dashboard - VERIFIKASI STRUKTUR & ISOLASI
-- Cara pakai: Supabase -> SQL Editor -> tempel SELURUH berkas -> Run.
-- Sifatnya READ-ONLY untuk data asli: seluruh skrip berjalan di dalam satu transaksi
-- yang di-ROLLBACK di akhir, jadi data uji sementara tidak tertinggal.
-- Yang diperiksa: nilai hasil harus "PASS" di setiap baris.
-- ============================================================================
BEGIN;

CREATE TEMP TABLE _v (no int, uji text, hasil text) ON COMMIT DROP;

INSERT INTO _v VALUES
 (1, 'Tabel kontrol tersedia (clients, plans, subscriptions, platform_admins, audit_logs, client_events)',
     CASE WHEN to_regclass('public.clients') IS NOT NULL
           AND to_regclass('public.plans') IS NOT NULL
           AND to_regclass('public.subscriptions') IS NOT NULL
           AND to_regclass('public.platform_admins') IS NOT NULL
           AND to_regclass('public.audit_logs') IS NOT NULL
           AND to_regclass('public.client_events') IS NOT NULL
          THEN 'PASS' ELSE 'FAIL' END),
 (2, 'tenants.client_id ada, NOT NULL, dan semua cabang sudah terisi',
     CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = 'tenants'
                          AND column_name = 'client_id' AND is_nullable = 'NO')
           AND NOT EXISTS (SELECT 1 FROM public.tenants WHERE client_id IS NULL)
          THEN 'PASS' ELSE 'FAIL' END),
 (3, 'RLS aktif pada 6 tabel baru',
     CASE WHEN (SELECT count(*) FROM pg_class
                 WHERE relnamespace = 'public'::regnamespace
                   AND relname IN ('clients','plans','subscriptions','platform_admins','audit_logs','client_events')
                   AND relrowsecurity) = 6 THEN 'PASS' ELSE 'FAIL' END),
 (4, 'audit_logs append-only (authenticated hanya boleh SELECT)',
     CASE WHEN has_table_privilege('authenticated','public.audit_logs','SELECT')
           AND NOT has_table_privilege('authenticated','public.audit_logs','INSERT')
           AND NOT has_table_privilege('authenticated','public.audit_logs','UPDATE')
           AND NOT has_table_privilege('authenticated','public.audit_logs','DELETE')
          THEN 'PASS' ELSE 'FAIL' END),
 (5, 'client_events tidak bisa diubah/dihapus client',
     CASE WHEN has_table_privilege('authenticated','public.client_events','INSERT')
           AND NOT has_table_privilege('authenticated','public.client_events','UPDATE')
           AND NOT has_table_privilege('authenticated','public.client_events','DELETE')
          THEN 'PASS' ELSE 'FAIL' END),
 (6, 'platform_admins tidak punya policy tulis (anti promosi diri)',
     CASE WHEN (SELECT count(*) FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = 'platform_admins' AND cmd <> 'SELECT') = 0
          THEN 'PASS' ELSE 'FAIL' END),
 (7, 'can_access_tenant() sudah dibatasi ke client (perbaikan kebocoran)',
     CASE WHEN pg_get_functiondef('public.can_access_tenant(text)'::regprocedure) LIKE '%app_client_id%'
          THEN 'PASS' ELSE 'FAIL' END),
 (8, 'delete_app_user() versi diperketat (ada batas client)',
     CASE WHEN pg_get_functiondef('public.delete_app_user(text)'::regprocedure) LIKE '%client Anda%'
          THEN 'PASS' ELSE 'FAIL' END),
 (9, 'Trigger log bisnis terpasang (8 trigger)',
     CASE WHEN (SELECT count(*) FROM pg_trigger WHERE tgname IN
                 ('trg_audit_stock','trg_audit_profile','trg_audit_sale','trg_audit_return',
                  'trg_audit_clients','trg_audit_tenants','trg_audit_plans','trg_audit_subscriptions')) = 8
          THEN 'PASS' ELSE 'FAIL' END),
 (10,'Gate langganan terpasang pada sales & stock_returns',
     CASE WHEN (SELECT count(*) FROM pg_trigger WHERE tgname IN ('trg_gate_sale','trg_gate_return')) = 2
          THEN 'PASS' ELSE 'FAIL' END),
 (11,'Batas paket terpasang pada tenants & profiles',
     CASE WHEN (SELECT count(*) FROM pg_trigger WHERE tgname IN ('trg_plan_limit_branch','trg_plan_limit_user')) = 2
          THEN 'PASS' ELSE 'FAIL' END),
 (12,'Cabang lama tetap punya langganan aktif (POS tidak terganggu)',
     CASE WHEN NOT EXISTS (
            SELECT 1 FROM public.tenants t
             WHERE NOT public.client_active_of_tenant(t.id))
          THEN 'PASS' ELSE 'FAIL' END),
 (13,'View v_client_overview tersedia',
     CASE WHEN to_regclass('public.v_client_overview') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END),
 (14,'Pembuatan id otomatis siap (clients & tenants punya default nextval)',
     CASE WHEN (SELECT count(*) FROM information_schema.columns
                 WHERE table_schema = 'public' AND ((table_name = 'clients' AND column_name = 'id')
                     OR (table_name = 'tenants' AND column_name = 'id'))
                   AND column_default LIKE '%nextval%') = 2 THEN 'PASS' ELSE 'FAIL' END),
 (15,'Hak POS lama tidak berubah (stock_items/sales/stock_returns tetap bisa dibaca)',
     CASE WHEN has_table_privilege('authenticated','public.stock_items','SELECT')
           AND has_table_privilege('authenticated','public.stock_items','INSERT')
           AND has_table_privilege('authenticated','public.sales','SELECT')
           AND has_table_privilege('authenticated','public.stock_returns','SELECT')
          THEN 'PASS' ELSE 'FAIL' END);

-- ---------------------------------------------------------------------------
-- Uji isolasi antar client (memakai pengguna uji sementara; di-ROLLBACK di akhir)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_user uuid := '00000000-0000-0000-0000-00000000c901'::uuid;
  v_own boolean;
  v_other boolean;
  v_result text := 'PASS';
  v_note text := '';
BEGIN
  BEGIN
    INSERT INTO public.clients (id, name) VALUES ('C9001', 'Uji Isolasi (sementara)');
    INSERT INTO public.plans (code, name, price_month, max_branches, max_users, is_active)
      VALUES ('uji_verifikasi', 'Paket Uji', 0, 99, 99, true);
    INSERT INTO public.subscriptions (client_id, plan_code, started_at, expires_at, status)
      VALUES ('C9001', 'uji_verifikasi', current_date, current_date + 30, 'aktif');
    INSERT INTO public.tenants (id, name, client_id) VALUES ('T901', 'Cabang Uji (sementara)', 'C9001');
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              'uji.isolasi@klontonk.local', 'x', now(), now(), now());
    INSERT INTO public.profiles (id, username, name, role, avatar, tenant_id)
      VALUES (v_user, 'uji_isolasi', 'Admin Uji', 'admin', 'U', 'T901');
  EXCEPTION WHEN others THEN
    INSERT INTO _v VALUES (16, 'Admin client A TIDAK bisa mengakses cabang client B',
                               'SKIP (data uji gagal dibuat: ' || SQLERRM || ')');
    RETURN;
  END;

  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_user::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', v_user::text, true);

  IF auth.uid() IS DISTINCT FROM v_user THEN
    INSERT INTO _v VALUES (16, 'Admin client A TIDAK bisa mengakses cabang client B',
                               'SKIP (auth.uid() tidak membaca klaim uji di project ini)');
    RETURN;
  END IF;

  v_own   := public.can_access_tenant('T901');
  v_other := public.can_access_tenant('T001');

  IF NOT v_own THEN
    v_result := 'FAIL'; v_note := 'admin client sendiri tidak bisa mengakses cabangnya sendiri';
  ELSIF v_other THEN
    v_result := 'FAIL'; v_note := 'BOCOR: admin C9001 bisa mengakses cabang client C0001';
  END IF;

  INSERT INTO _v VALUES (16, 'Admin client A TIDAK bisa mengakses cabang client B (tapi bisa cabangnya sendiri)',
                             v_result || CASE WHEN v_note <> '' THEN ' - ' || v_note ELSE '' END);
END $$;

SELECT no AS "No", uji AS "Uji", hasil AS "Hasil" FROM _v ORDER BY no;
ROLLBACK;