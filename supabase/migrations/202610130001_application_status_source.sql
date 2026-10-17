begin;
alter table public.applications
  add column status_source text not null default 'extension'
  check (status_source in ('extension', 'manual'));
-- 이전 데이터에는 변경 주체가 없으므로 이미 진행/종료된 상태는 보수적으로 보호한다.
update public.applications
set status_source = 'manual'
where status <> 'applied' or platform = 'manual';
-- 다른 기기에서 수동 변경과 가져오기가 겹쳐도 수동 상태가 우선한다.
create function public.preserve_manual_application_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status_source = 'manual' and new.status_source = 'extension' then
    new.status := old.status;
    new.status_source := old.status_source;
  end if;
  return new;
end;
$$;
create trigger preserve_manual_application_status
before update on public.applications
for each row execute function public.preserve_manual_application_status();
commit;
