-- 사용량 지표: 로그인 사용자의 방문 날짜 (#256, 결정 기록 004).
-- Supabase SQL Editor에서 한 번 실행한다. 저장소에 파일이 있는 것만으로 운영 DB에 적용되지는 않는다.
-- 집계: supabase/checks/usage_metrics.sql (읽기만 함)
begin;

-- 1) 하루(한국 날짜)에 한 줄. 무엇을 봤는지·몇 번 왔는지는 남기지 않고 "그날 왔다"만 남긴다.
--    탈퇴하면 계정과 함께 지워진다.
create table public.user_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  primary key (user_id, activity_date)
);
alter table public.user_activity enable row level security;

-- 2) 본인 방문만 기록한다. 사용자 ID와 날짜를 브라우저가 고르지 못하게 함수 안에서 정한다.
--    같은 날 여러 번 불러도 한 줄이다.
create function public.record_daily_activity()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    return;
  end if;
  insert into public.user_activity (user_id, activity_date)
  values (v_user_id, (now() at time zone 'Asia/Seoul')::date)
  on conflict do nothing;
end;
$$;

-- 권한: 브라우저는 표를 읽거나 쓰지 못하고, 로그인 사용자가 함수만 부를 수 있다. 집계는 SQL Editor(관리자)에서만.
revoke all on table public.user_activity from public, anon, authenticated;
grant select, insert, delete on table public.user_activity to service_role;
revoke execute on function public.record_daily_activity() from public, anon;
grant execute on function public.record_daily_activity() to authenticated;

commit;
