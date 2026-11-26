-- 사용량 지표 집계 (#256). Supabase SQL Editor에서 실행한다. 읽기만 하고 아무것도 바꾸지 않는다.
-- 날짜는 모두 한국 날짜. 지표 정의는 docs/METRICS.md.
-- 결과를 밖에 공유할 때는 숫자만 옮기고 사용자 ID·이메일은 옮기지 않는다(이 파일은 ID를 출력하지 않는다).

-- 1) 한눈에: 전체 숫자
select
  (select count(*) from auth.users)                                                          as "가입자",
  (select count(distinct user_id) from public.applications)                                  as "지원 1건 이상 넣은 사람",
  (select count(*) from public.applications)                                                 as "지원 전체",
  (select count(*) from public.applications where status_source = 'extension')               as "익스텐션으로 가져온 지원",
  (select count(*) from public.application_analyses)                                         as "회사 정보 만든 지원",
  (select coalesce(sum(count), 0) from public.ai_usage)                                      as "AI 새로 만든 횟수",
  (select count(distinct user_id) from public.user_activity
     where activity_date = (now() at time zone 'Asia/Seoul')::date)                          as "오늘 활성",
  (select count(distinct user_id) from public.user_activity
     where activity_date > (now() at time zone 'Asia/Seoul')::date - 7)                      as "최근 7일 활성",
  (select count(distinct user_id) from public.user_activity
     where activity_date > (now() at time zone 'Asia/Seoul')::date - 30)                     as "최근 30일 활성";

-- 2) 최근 30일 날짜별: 가입 · 활성 · 지원 추가 · 회사 정보
with days as (
  select generate_series((now() at time zone 'Asia/Seoul')::date - 29, (now() at time zone 'Asia/Seoul')::date, interval '1 day')::date as day
)
select
  days.day as "날짜",
  (select count(*) from auth.users u where (u.created_at at time zone 'Asia/Seoul')::date = days.day)               as "가입",
  (select count(*) from public.user_activity a where a.activity_date = days.day)                                    as "활성",
  (select count(*) from public.applications p where (p.created_at at time zone 'Asia/Seoul')::date = days.day)      as "지원 추가",
  (select count(*) from public.application_analyses c where (c.created_at at time zone 'Asia/Seoul')::date = days.day) as "회사 정보"
from days
order by days.day desc;

-- 3) 가입 주별 재방문: 가입한 날 다음 1~7일 안에 다시 온 사람의 비율
--    방문 기록(#256)을 넣기 전에 가입한 사람은 가입 직후 기록이 없으므로 넣은 뒤 가입자부터 본다.
with cohort as (
  select u.id, (u.created_at at time zone 'Asia/Seoul')::date as signup_date
  from auth.users u
  where u.created_at >= '2026-11-25'
)
select
  date_trunc('week', cohort.signup_date)::date as "가입 주(월요일)",
  count(*)                                       as "가입",
  count(*) filter (where exists (
    select 1 from public.user_activity a
    where a.user_id = cohort.id and a.activity_date between cohort.signup_date + 1 and cohort.signup_date + 7
  ))                                             as "1주 안에 다시 옴",
  round(100.0 * count(*) filter (where exists (
    select 1 from public.user_activity a
    where a.user_id = cohort.id and a.activity_date between cohort.signup_date + 1 and cohort.signup_date + 7
  )) / nullif(count(*), 0), 1)                   as "재방문율(%)"
from cohort
group by 1
order by 1 desc;
