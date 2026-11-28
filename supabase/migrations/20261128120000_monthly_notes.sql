-- 이번 달 돌아보기의 "이번 달 한 줄" (#316). 사용자가 달마다 직접 적는 짧은 글(100자)을 달별로 하나 둔다.
-- 지원 기록처럼 본인만 읽고 쓴다. 탈퇴하면 auth.users와 함께 지워진다(on delete cascade).
begin;

create table public.monthly_notes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'), -- YYYY-MM (한국 날짜 기준 달)
  note text not null check (char_length(note) between 1 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
alter table public.monthly_notes enable row level security;

create policy "본인 한 줄 조회" on public.monthly_notes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "본인 한 줄 쓰기" on public.monthly_notes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "본인 한 줄 고치기" on public.monthly_notes
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "본인 한 줄 지우기" on public.monthly_notes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 권한: 로그인한 사용자만(위 정책으로 본인 행만), 익명은 막는다
revoke all on table public.monthly_notes from public, anon;
grant select, insert, update, delete on table public.monthly_notes to authenticated;
grant select, insert, update, delete on table public.monthly_notes to service_role;

commit;
