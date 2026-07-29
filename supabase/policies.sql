-- applications 테이블 RLS 정책
--
-- 이 SQL은 기록/재현용이다. 실제 적용은 Supabase 대시보드의 SQL Editor에서
-- 수동으로 실행했으며, 이 파일을 다시 실행해서 적용한 적은 없다.
-- 참고: docs/SUPABASE.md §5 (RLS)
--
-- RLS는 테이블 생성 시 자동으로 활성화되어 있다 (Supabase의 "Automatic RLS").
-- 아래는 그 위에 얹는 접근 정책 4개(select/insert/update/delete)다.

-- 조회: 본인 데이터만
create policy "본인 데이터 조회"
on applications for select
using (auth.uid() = user_id);

-- 삽입: 본인 user_id로만 (타인 행세 방지)
create policy "본인 데이터 삽입"
on applications for insert
with check (auth.uid() = user_id);

-- 수정: 본인 데이터만
create policy "본인 데이터 수정"
on applications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 삭제: 본인 데이터만
create policy "본인 데이터 삭제"
on applications for delete
using (auth.uid() = user_id);
