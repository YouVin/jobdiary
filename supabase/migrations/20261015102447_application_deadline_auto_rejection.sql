begin;

alter table public.applications
  add column deadline_at date;

alter table public.applications
  drop constraint applications_status_source_check;

alter table public.applications
  add constraint applications_status_source_check
  check (status_source in ('extension', 'manual', 'deadline'));

-- 자동 분류도 익스텐션의 오래된 상태로 되돌리지 않는다.
create or replace function public.preserve_manual_application_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status_source in ('manual', 'deadline') and new.status_source = 'extension' then
    new.status := old.status;
    new.status_source := old.status_source;
  end if;
  return new;
end;
$$;

commit;
