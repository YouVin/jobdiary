-- 회사 정보(공고 분석 AI) 저장소와 하루 사용 한도 (#228, 결정 기록 002).
-- Supabase SQL Editor에서 한 번 실행한다. 저장소에 파일이 있는 것만으로 운영 DB에 적용되지는 않는다.
-- 확인: supabase/checks/company_info_verify.sql (실행 후 모두 롤백)
begin;

-- 1) 공고별 분석 결과. 사용자 정보가 없어 같은 공고를 붙여 넣은 사용자끼리 결과를 같이 쓴다(비용·한도 절약).
--    브라우저 역할은 접근할 수 없고 Edge Function(service_role)만 읽고 쓴다.
create table public.posting_analyses (
  id uuid primary key default gen_random_uuid(),
  posting_hash text not null unique,      -- 지시문 버전·모델·방식·회사 이름·공고 본문으로 만든 SHA-256
  model text not null,
  prompt_version text not null,
  result jsonb not null,
  usage jsonb not null,                   -- 실제 토큰 사용량(비용 실측용)
  cost_usd numeric(12, 6) not null,
  created_at timestamptz not null default now()
);
alter table public.posting_analyses enable row level security;

-- 2) 내 지원에 연결된 회사 정보. 결과를 복사해 두어 브라우저는 이 표만 본인 것으로 읽는다.
create table public.application_analyses (
  application_id uuid primary key references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  posting_analysis_id uuid references public.posting_analyses(id) on delete set null,
  result jsonb not null,
  model text not null,
  created_at timestamptz not null default now()
);
create index application_analyses_user_id_idx on public.application_analyses (user_id);
alter table public.application_analyses enable row level security;
create policy "본인 회사 정보 조회" on public.application_analyses
  for select to authenticated using ((select auth.uid()) = user_id);

-- 3) 사용자별 하루(한국 날짜) 새로 만든 횟수
create table public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, usage_date)
);
alter table public.ai_usage enable row level security;

-- 한도 안이면 1 올리고 true, 이미 한도면 false. 세기와 올리기를 한 문장으로 해서 동시에 눌러도 한도를 넘지 않는다.
create function public.consume_ai_quota(p_user_id uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_limit < 1 then
    return false;
  end if;
  insert into public.ai_usage as usage (user_id, usage_date, count)
  values (p_user_id, (now() at time zone 'Asia/Seoul')::date, 1)
  on conflict (user_id, usage_date) do update
    set count = usage.count + 1
    where usage.count < p_limit
  returning usage.count into v_count;
  return v_count is not null;
end;
$$;

-- AI 실패처럼 사용자 잘못이 아닌 경우 오늘 쓴 1번을 되돌린다.
create function public.release_ai_quota(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage
  set count = count - 1
  where user_id = p_user_id
    and usage_date = (now() at time zone 'Asia/Seoul')::date
    and count > 0;
$$;

-- 권한: 브라우저(anon·authenticated)는 본인 회사 정보 읽기만. 나머지는 Edge Function(service_role)만.
-- 이 프로젝트는 새 표를 Data API 역할에 자동으로 열지 않으므로(config.toml) service_role에도 명시적으로 준다.
revoke all on table public.posting_analyses, public.application_analyses, public.ai_usage from public, anon, authenticated;
grant select on table public.application_analyses to authenticated;
grant select, insert, update, delete on table public.posting_analyses, public.application_analyses, public.ai_usage to service_role;
revoke execute on function public.consume_ai_quota(uuid, integer), public.release_ai_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, integer), public.release_ai_quota(uuid) to service_role;

commit;
