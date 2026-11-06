import { describe, expect, it } from 'vitest';
import { parseSaramin } from './saramin';
import { convertToApplication } from '../lib/adapter';

function fixture(html: string): HTMLDivElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

describe('parseSaramin', () => {
  it('삭제 안내 툴팁이 포함된 행의 빈 date_end를 지원일·취소일로 보충하지 않는다', () => {
    // 제공받은 지원현황의 구조만 재현한다. 원본 이름/지원 ID/추적 정보는 보관하지 않는다.
    const root = fixture(`<div class="list_status">
      <div class="row _apply_list" data-company_nm="예시 회사" data-rec_division="" data-recruittitle="개발자" data-recruitapply_idx="100">
        <div class="col_date">2026.09.27 21:42</div>
        <div class="col_summary"><div class="recruit"><a href="/zf_user/jobs/relay/view?rec_idx=100">
          <div class="TipBox"><span>개발자</span><div class="TipCont"><div class="TipTxt">해당 공고는 삭제되었습니다</div></div></div>
        </a></div><div class="status"><em class="txt_status">지원완료</em><span class="txt_sub">점핏 제공 공고</span></div></div>
        <div class="col_btns"><div class="action"><span class="date_end"></span></div></div>
      </div></div>`);
    const [row] = parseSaramin(root);
    expect(row.appliedAt).toBe('2026.09.27 21:42');
    expect(row).not.toHaveProperty('deadlineAt');
    expect(convertToApplication(row)).not.toHaveProperty('deadlineAt');
    expect(convertToApplication(row).status).toBe('applied');
  });

  it('일반 행을 파싱한다', () => {
    const root = fixture(`
      <div class="row _apply_list" data-company_nm="㈜플레이웍스" data-rec_division="프론트엔드 개발자" data-recruitapply_idx="1001">
        <div class="recruit"><a href="/zf_user/jobs/relay/view?rec_idx=1001">프론트엔드 개발자</a></div>
        <div class="col_date">2026.06.09 20:27</div>
        <div class="txt_status">지원완료</div>
        <div class="txt_sub">미열람</div>
      </div>
    `);

    const [row] = parseSaramin(root);

    expect(row.company).toBe('㈜플레이웍스');
    expect(row.position).toBe('프론트엔드 개발자');
    expect(row.appliedAt).toBe('2026.06.09 20:27');
    expect(row.appliedAtExact).toBe('2026.06.09 20:27');
    expect(row.status).toBe('지원완료');
    expect(row.externalId).toBe('1001');
    expect(row.viewed).toBe(false);
    expect(row.url).toBe(`${location.origin}/zf_user/jobs/relay/view?rec_idx=1001`);
  });

  it('점핏 연동 공고는 rec_division이 비어 있으면 recruittitle로 폴백한다', () => {
    const root = fixture(`
      <div class="row _apply_list" data-company_nm="점핏컴퍼니" data-rec_division="" data-recruittitle="백엔드 개발자 (Node.js)" data-recruitapply_idx="1002">
        <div class="col_date">2026.06.08 10:00</div>
        <div class="txt_status">지원완료</div>
        <div class="txt_sub">열람</div>
      </div>
    `);

    const [row] = parseSaramin(root);

    expect(row.position).toBe('백엔드 개발자 (Node.js)');
    expect(row.viewed).toBe(true);
    expect(row.url).toBeUndefined();
  });

  it('지원취소완료 행은 txt_sub에 취소일시가 들어와도 viewed를 undefined로 둔다', () => {
    const root = fixture(`
      <div class="row _apply_list" data-company_nm="캔슬컴퍼니" data-rec_division="디자이너" data-recruitapply_idx="1003">
        <div class="recruit"><a href="/zf_user/jobs/relay/view?rec_idx=1003">디자이너</a></div>
        <div class="col_date">2026.07.12 19:33</div>
        <div class="txt_status">지원취소</div>
        <div class="txt_sub">2026.07.12 19:33</div>
      </div>
    `);

    const [row] = parseSaramin(root);

    expect(row.status).toBe('지원취소');
    expect(row.viewed).toBeUndefined();
  });

  it('컨테이너가 없으면 빈 배열을 반환한다', () => {
    expect(parseSaramin(fixture('<div>지원내역 없음</div>'))).toEqual([]);
  });
});
