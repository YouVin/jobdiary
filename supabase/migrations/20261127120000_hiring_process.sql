-- 공고 전형 절차 (#295). 지원마다 공고의 절차(서류 → 코딩테스트 → 1차 면접 → 최종 합격 …)를 단계로 둔다.
-- 글로 적힌 절차는 웹이 규칙으로 읽고, 이미지뿐인 공고만 Edge Function(hiring-process)이 AI로 읽는다.
begin;

-- 1) 지원별 절차. null이면 아직 읽지 않은 지원이다.
--    {steps: [{name, kind}], source: text|ai|manual|none, step: 지금 단계 번호(없으면 지원 단계로 계산), checkedAt}
--    지원 행의 다른 칸처럼 본인만 읽고 쓴다(applications RLS).
alter table public.applications
  add column hiring_process jsonb
  check (
    hiring_process is null
    or (jsonb_typeof(hiring_process -> 'steps') = 'array' and jsonb_array_length(hiring_process -> 'steps') <= 10 and pg_column_size(hiring_process) <= 4000)
  );

-- 2) 공고별 AI 결과. 사용자 정보 없이 공고 지문으로만 저장해 같은 공고는 다시 부르지 않는다(비용 절약).
create table public.posting_processes (
  posting_hash text primary key,          -- 지시문 버전·모델·공고 글·이미지로 만든 SHA-256
  steps jsonb not null,
  model text not null,
  prompt_version text not null,
  usage jsonb not null,
  cost_usd numeric(12, 6) not null,
  created_at timestamptz not null default now()
);
alter table public.posting_processes enable row level security;

-- 3) 사용자별 하루(한국 날짜) AI로 절차를 읽은 횟수. 회사 정보 한도(ai_usage)와 따로 센다.
create table public.process_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, usage_date)
);
alter table public.process_usage enable row level security;

-- 한도 안이면 1 올리고 true. 세기와 올리기를 한 문장으로 해서 동시에 불러도 한도를 넘지 않는다(consume_ai_quota와 같은 방식).
create function public.consume_process_quota(p_user_id uuid, p_limit integer)
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
  insert into public.process_usage as usage (user_id, usage_date, count)
  values (p_user_id, (now() at time zone 'Asia/Seoul')::date, 1)
  on conflict (user_id, usage_date) do update
    set count = usage.count + 1
    where usage.count < p_limit
  returning usage.count into v_count;
  return v_count is not null;
end;
$$;

-- AI 실패처럼 사용자 잘못이 아닌 경우 오늘 쓴 1번을 되돌린다.
create function public.release_process_quota(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.process_usage
  set count = count - 1
  where user_id = p_user_id
    and usage_date = (now() at time zone 'Asia/Seoul')::date
    and count > 0;
$$;

-- 권한: 브라우저는 공고별 결과·횟수 표에 접근하지 못한다. Edge Function(service_role)만.
revoke all on table public.posting_processes, public.process_usage from public, anon, authenticated;
grant select, insert, update, delete on table public.posting_processes, public.process_usage to service_role;
revoke execute on function public.consume_process_quota(uuid, integer), public.release_process_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_process_quota(uuid, integer), public.release_process_quota(uuid) to service_role;

commit;
