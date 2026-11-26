-- 가입 경로 (#290). 홍보 링크(utm)나 바깥 사이트에서 처음 들어와 가입한 사람만 계정당 1줄.
-- Vercel Hobby는 utm을 대시보드에 보여 주지 않아 직접 센다. 집계: supabase/checks/usage_metrics.sql
begin;

-- 1) 어디서 왔는지만 남긴다. 링크의 출처 표시(utm)·이전 사이트 도메인·처음 본 페이지 경로. 탈퇴하면 함께 지워진다.
create table public.user_acquisition (
  user_id uuid primary key references auth.users(id) on delete cascade,
  source text check (char_length(source) <= 60),
  medium text check (char_length(medium) <= 60),
  campaign text check (char_length(campaign) <= 60),
  referrer text check (char_length(referrer) <= 100),
  landing_path text check (char_length(landing_path) <= 100),
  created_at timestamptz not null default now()
);
alter table public.user_acquisition enable row level security;

-- 2) 가입한 지 하루가 안 된 본인 계정만 한 번 기록한다. 기존 사용자가 홍보 링크를 눌러도 가입 경로로 세지 않는다.
--    값은 영문·숫자·._- 만 남겨 길이를 자르고, 경로는 /로 시작하는 주소 모양일 때만 받는다. 저장했으면 true.
create function public.record_acquisition(p_source text, p_medium text, p_campaign text, p_referrer text, p_landing text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_created_at timestamptz;
  v_inserted integer;
begin
  if v_user_id is null then
    return false;
  end if;
  select created_at into v_created_at from auth.users where id = v_user_id;
  if v_created_at is null or v_created_at < now() - interval '1 day' then
    return false;
  end if;

  insert into public.user_acquisition (user_id, source, medium, campaign, referrer, landing_path)
  values (
    v_user_id,
    nullif(left(lower(regexp_replace(coalesce(p_source, ''), '[^a-zA-Z0-9._-]', '', 'g')), 60), ''),
    nullif(left(lower(regexp_replace(coalesce(p_medium, ''), '[^a-zA-Z0-9._-]', '', 'g')), 60), ''),
    nullif(left(lower(regexp_replace(coalesce(p_campaign, ''), '[^a-zA-Z0-9._-]', '', 'g')), 60), ''),
    -- 이전 사이트는 도메인만: 첫 / 앞까지
    nullif(left(lower(regexp_replace(split_part(coalesce(p_referrer, ''), '/', 1), '[^a-zA-Z0-9.-]', '', 'g')), 100), ''),
    case when p_landing ~ '^/[a-zA-Z0-9/_-]{0,99}$' then p_landing end
  )
  on conflict (user_id) do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted > 0;
end;
$$;

-- 권한: 브라우저는 표를 읽거나 쓰지 못하고, 로그인 사용자가 함수만 부를 수 있다. 집계는 SQL Editor(관리자)에서만.
revoke all on table public.user_acquisition from public, anon, authenticated;
grant select, insert, delete on table public.user_acquisition to service_role;
revoke execute on function public.record_acquisition(text, text, text, text, text) from public, anon;
grant execute on function public.record_acquisition(text, text, text, text, text) to authenticated;

commit;
