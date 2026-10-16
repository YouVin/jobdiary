begin;
-- 브라우저 역할에는 로그인 후 CRUD만 허용한다.
revoke all privileges on table public.applications from public, anon, authenticated;
grant select, insert, update, delete on table public.applications to authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.preserve_manual_application_status() from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter policy "본인 데이터 조회" on public.applications to authenticated using ((select auth.uid()) = user_id);
alter policy "본인 데이터 삽입" on public.applications to authenticated with check ((select auth.uid()) = user_id);
alter policy "본인 데이터 수정" on public.applications to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "본인 데이터 삭제" on public.applications to authenticated using ((select auth.uid()) = user_id);
commit;;
