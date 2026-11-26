begin;
-- 단계 변경 이력 (#283). 단계가 바뀔 때마다 {from, to, source, at}을 붙인다.
-- 웹·익스텐션·마감 자동 탈락이 모두 이 트리거를 지나므로 쓰는 쪽은 아무것도 보내지 않는다.
-- 브라우저가 이 칸에 값을 보내도 무시하고 DB가 이어 쓴다. 이 마이그레이션 전 지원은 빈 배열로 시작한다.
alter table public.applications
  add column status_history jsonb not null default '[]'::jsonb;

create function public.record_application_status_history()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  if tg_op = 'INSERT' then
    new.status_history := jsonb_build_array(
      jsonb_build_object('from', null, 'to', new.status, 'source', new.status_source, 'at', now())
    );
    return new;
  end if;

  new.status_history := old.status_history;
  if new.status is distinct from old.status then
    new.status_history := new.status_history
      || jsonb_build_object('from', old.status, 'to', new.status, 'source', new.status_source, 'at', now());
    -- 같은 지원을 계속 옮겨도 행이 커지지 않게 최근 50번만 둔다
    v_count := jsonb_array_length(new.status_history);
    if v_count > 50 then
      select jsonb_agg(item order by position)
      into new.status_history
      from jsonb_array_elements(new.status_history) with ordinality as entries(item, position)
      where position > v_count - 50;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.record_application_status_history() from public, anon, authenticated;

-- 같은 BEFORE UPDATE 트리거는 이름 순서로 돈다. preserve_manual_application_status(p)가
-- 수동 단계를 지켜 되돌린 뒤 이 트리거(r)가 돌아서, 실제로 바뀐 단계만 남는다.
create trigger record_application_status_history
before insert or update on public.applications
for each row execute function public.record_application_status_history();
commit;
