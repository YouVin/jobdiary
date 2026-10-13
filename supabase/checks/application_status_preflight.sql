-- 마이그레이션 전 읽기 전용 점검. 개인 기록 대신 건수와 데이터 지문만 출력한다.
select jsonb_build_object(
  'row_count', (select count(*) from public.applications),
  'protected_count', (select count(*) from public.applications where status <> 'applied' or platform = 'manual'),
  'data_fingerprint', (select md5(string_agg(md5((to_jsonb(a) - 'status_source')::text), ',' order by id)) from public.applications a),
  'rls_enabled', (select relrowsecurity from pg_class where oid = 'public.applications'::regclass),
  'triggers', (select coalesce(jsonb_agg(pg_get_triggerdef(oid)), '[]'::jsonb) from pg_trigger where tgrelid = 'public.applications'::regclass and not tgisinternal),
  'policies', (select jsonb_agg(jsonb_build_object('name', policyname, 'command', cmd)) from pg_policies where schemaname = 'public' and tablename = 'applications'),
  'function_exists', to_regprocedure('public.preserve_manual_application_status()') is not null
) as preflight;
