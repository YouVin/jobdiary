-- 운영 행을 수정하지 않고 임시 테이블에서 실제 DB 함수를 검증한 뒤 모두 롤백한다.
begin;

create temporary table application_status_test (
  id integer primary key,
  status text not null,
  status_source text not null,
  company text not null
) on commit drop;

create trigger application_status_test_trigger
before update on application_status_test
for each row execute function public.preserve_manual_application_status();

insert into application_status_test values
  (1, 'rejected', 'manual', 'before'),
  (2, 'applied', 'extension', 'before');

-- 수집 요청은 수동 탈락을 되돌리지 못하고, 회사명은 갱신한다.
update application_status_test
set status = 'applied', status_source = 'extension', company = 'after'
where id = 1;

-- 자동 수집 상태는 계속 갱신한다.
update application_status_test set status = 'canceled' where id = 2;

do $$
begin
  if not exists (select 1 from application_status_test where id = 1 and status = 'rejected' and status_source = 'manual' and company = 'after') then
    raise exception 'manual status preservation failed';
  end if;
  if not exists (select 1 from application_status_test where id = 2 and status = 'canceled' and status_source = 'extension') then
    raise exception 'extension status update failed';
  end if;
end;
$$;

-- 직접 변경하는 것은 계속 허용한다.
update application_status_test set status = 'offer', status_source = 'manual' where id = 1;

do $$
begin
  if not exists (select 1 from application_status_test where id = 1 and status = 'offer') then
    raise exception 'manual status update failed';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.applications'::regclass
      and tgname = 'preserve_manual_application_status'
      and tgfoid = 'public.preserve_manual_application_status()'::regprocedure
      and tgenabled = 'O'
  ) then
    raise exception 'production trigger missing or disabled';
  end if;
end;
$$;

rollback;

select 'passed' as trigger_tests,
  count(*) as row_count,
  count(*) filter (where status_source = 'manual') as manual_count,
  count(*) filter (where status_source = 'extension') as extension_count,
  md5(string_agg(md5((to_jsonb(a) - 'status_source')::text), ',' order by id)) as data_fingerprint
from public.applications a;
