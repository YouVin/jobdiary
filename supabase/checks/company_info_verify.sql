-- 회사 정보 마이그레이션(20261124120000_company_info.sql) 적용 후 확인 (#228).
-- 운영 행을 남기지 않도록 임시 사용자로 확인하고 모두 롤백한다. SQL Editor에서 통째로 실행한다.
begin;

-- 표·정책·함수가 있는지
select
  to_regclass('public.posting_analyses') is not null as posting_analyses,
  to_regclass('public.application_analyses') is not null as application_analyses,
  to_regclass('public.ai_usage') is not null as ai_usage,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'application_analyses') as application_analyses_policies,
  has_table_privilege('authenticated', 'public.application_analyses', 'select') as authenticated_can_read_own,
  not has_table_privilege('authenticated', 'public.posting_analyses', 'select') as authenticated_cannot_read_cache,
  not has_table_privilege('authenticated', 'public.ai_usage', 'select') as authenticated_cannot_read_usage,
  not has_function_privilege('authenticated', 'public.consume_ai_quota(uuid, integer)', 'execute') as authenticated_cannot_consume;

-- 하루 한도: 임시 사용자로 6번 시도 → true 5번, false 1번. 되돌리면 다시 1번 가능.
insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000c0de', 'company-info-check@example.invalid');
select array(select public.consume_ai_quota('00000000-0000-4000-8000-00000000c0de', 5) from generate_series(1, 6)) as six_tries;
-- 같은 문장 안에서 세면 함수가 올리기 전 값을 볼 수 있어 따로 센다.
select count as count_after from public.ai_usage where user_id = '00000000-0000-4000-8000-00000000c0de';
select public.release_ai_quota('00000000-0000-4000-8000-00000000c0de');
select public.consume_ai_quota('00000000-0000-4000-8000-00000000c0de', 5) as after_release;

rollback;
