-- 앱 안 의견 보내기 (#278). main 병합 시 자동 반영(supabase-deploy.yml).
-- 운영자는 SQL Editor에서 읽는다: select created_at, page, message from public.feedback order by created_at desc;
begin;

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 1000),
  page text not null default '' check (char_length(page) <= 200), -- 보낸 화면 경로(쿼리 없음)
  created_at timestamptz not null default now()
);
create index feedback_created_at_idx on public.feedback (created_at desc);
alter table public.feedback enable row level security;

-- 본인 이름으로만, 하루(한국 날짜) 10번까지 저장한다. 사용자·시각은 함수가 정한다.
create function public.send_feedback(p_message text, p_page text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_message text := btrim(coalesce(p_message, ''));
  v_today_count integer;
begin
  if v_user_id is null or char_length(v_message) = 0 or char_length(v_message) > 1000 then
    return false;
  end if;
  select count(*) into v_today_count
  from public.feedback
  where user_id = v_user_id
    and (created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date;
  if v_today_count >= 10 then
    return false;
  end if;
  insert into public.feedback (user_id, message, page)
  values (v_user_id, v_message, left(coalesce(p_page, ''), 200));
  return true;
end;
$$;

-- 권한: 브라우저는 표를 읽거나 쓰지 못하고, 로그인 사용자가 함수만 부른다.
revoke all on table public.feedback from public, anon, authenticated;
grant select, insert, delete on table public.feedback to service_role;
revoke execute on function public.send_feedback(text, text) from public, anon;
grant execute on function public.send_feedback(text, text) to authenticated;

commit;
