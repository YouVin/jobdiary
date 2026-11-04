import { describe, expect, it } from 'vitest';
import { parseJobkorea } from './jobkorea';
import { convertToApplication } from '../lib/adapter';

function fixture(html: string): HTMLDivElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

describe('parseJobkorea', () => {
  it('지원 행의 extra만 마감 원문으로 읽고 추천공고 날짜를 섞지 않는다', () => {
    // 사용자 제공 실물 DOM에서 회사·ID·지원 데이터 등을 예시값으로 치환하고
    // 수집과 무관한 이력서 링크/메시지/추적 속성은 제외했다.
    const root = fixture(`
      <table><tbody>
        <tr>
          <td rowspan="2"><div class="apply-status"><div class="inner">
            <div class="item status">지원완료</div><div class="item date">2026.10.21</div>
          </div></div></td>
          <td><div class="apply-board"><div class="inner">
            <div class="company"><a>지원 회사</a></div>
            <div class="description"><a href="/Recruit/GI_Read/100">개발자 (~10/31)</a></div>
          </div></div></td>
          <td><div class="apply-progress"><div class="inner">
            <div class="status">진행중</div><div class="extra">(~10/31)</div>
          </div></div></td>
          <td><div class="reading"><div class="inner">열람<div class="date">2026.10.22</div></div></div></td>
          <td><button data-memname="지원 회사" data-gititle="개발자" data-applydate="20261021120000" data-idx="100">지원취소</button></td>
        </tr>
        <tr><td colspan="4"><div class="similar"><ul><li>
          <div class="company"><a>추천 회사</a></div>
          <div class="description"><a>추천 공고</a></div>
          <div class="deadline">~11.30(월)</div>
        </li></ul></div></td></tr>
      </tbody></table>
    `);
    const rows = parseJobkorea(root);
    expect(rows).toHaveLength(1);
    expect(rows[0].deadlineAt).toBe('(~10/31)');
    expect(rows[0].position).toBe('개발자');
    // 지원일에는 연도가 있어도 마감일의 연도라고 단정할 수 없다.
    expect(convertToApplication(rows[0])).not.toHaveProperty('deadlineAt');
    expect(convertToApplication(rows[0]).status).toBe('applied');
  });

  it.each(['(상시)', '(~11/22)', ''])('구형 행의 마감 표시 %s에서도 날짜를 추정하지 않는다', (deadline) => {
    const root = fixture(`<table><tbody><tr>
      <td><div class="company"><a>예시 회사</a></div>
      <div class="description"><a>예시 공고 (~12/31)</a></div></td>
      <td class="apply-status"><span class="item status">지원완료</span><span class="date">2026.10.01</span></td>
      <td class="apply-progress"><div class="extra">${deadline}</div></td>
      <td><button class="devBtnOldDel" data-idx="200">지원취소</button></td>
    </tr></tbody></table>`);
    const [row] = parseJobkorea(root);
    if (deadline) expect(row.deadlineAt).toBe(deadline);
    else expect(row).not.toHaveProperty('deadlineAt');
    expect(convertToApplication(row)).not.toHaveProperty('deadlineAt');
  });

  it('최신 형식(버튼 data 속성)을 파싱하고 applydate를 변환한다', () => {
    const root = fixture(`
      <table><tbody>
        <tr>
          <td class="company"><a href="/Recruit/GI_Read/123">㈜플레이웍스</a></td>
          <td class="description"><a href="/Recruit/GI_Read/123">프론트엔드 개발자</a></td>
          <td class="apply-status">
            <span class="item status">지원완료</span>
            <span class="date">2026.06.01</span>
            <span class="reading">미열람</span>
          </td>
          <td><button class="devBtnDel" data-memname="㈜플레이웍스" data-gititle="프론트엔드 개발자" data-applydate="20260601235538" data-idx="9001">지원취소</button></td>
        </tr>
      </tbody></table>
    `);

    const [row] = parseJobkorea(root);

    expect(row.company).toBe('㈜플레이웍스');
    expect(row.position).toBe('프론트엔드 개발자');
    expect(row.appliedAt).toBe('2026.06.01 23:55');
    expect(row.appliedAtExact).toBe('2026.06.01 23:55:38');
    expect(row.status).toBe('지원완료');
    expect(row.externalId).toBe('9001');
    expect(row.viewed).toBe(false);
    expect(row.url).toBe(`${location.origin}/Recruit/GI_Read/123`);
  });

  it('오래된 형식(devBtnOldDel)은 버튼에 memname/gititle/applydate가 없어 본문 텍스트로 폴백한다', () => {
    const root = fixture(`
      <table><tbody>
        <tr>
          <td class="company"><a href="/Recruit/GI_Read/456">오래된회사</a></td>
          <td class="description"><a href="/Recruit/GI_Read/456">백엔드 개발자</a></td>
          <td class="apply-status">
            <span class="item status">지원완료</span>
            <span class="date">2026.04.01</span>
            <span class="reading">열람\n2026.04.03</span>
          </td>
          <td><button class="devBtnOldDel" data-idx="8001">지원취소</button></td>
        </tr>
      </tbody></table>
    `);

    const [row] = parseJobkorea(root);

    expect(row.company).toBe('오래된회사');
    expect(row.position).toBe('백엔드 개발자');
    expect(row.appliedAt).toBe('2026.04.01');
    expect(row.appliedAtExact).toBeUndefined();
    expect(row.externalId).toBe('8001');
    // '.reading' 텍스트가 "열람\n2026.04.03"처럼 열람일자가 붙어 있어도 시작 문자로 true 판정.
    expect(row.viewed).toBe(true);
  });

  it('데이터 속성도 회사명도 없는 빈 행은 결과에서 제외한다', () => {
    const root = fixture('<table><tbody><tr></tr></tbody></table>');
    expect(parseJobkorea(root)).toEqual([]);
  });

  it('지원 내역 다음 행의 유사 추천공고는 최신·구형 형식 지원 건수에 포함하지 않는다', () => {
    const root = fixture(`
      <table><tbody>
        <tr>
          <td class="apply-status" rowspan="2">
            <span class="item status">지원완료</span>
            <span class="date">2026.10.05</span>
          </td>
          <td class="company"><a href="/Recruit/Co_Read/C/1">최신 지원 회사</a></td>
          <td class="description"><a href="/Recruit/GI_Read/100">최신 지원 공고</a></td>
          <td><button data-memname="최신 지원 회사" data-gititle="최신 지원 공고" data-applydate="20261005171818" data-idx="9002">지원취소</button></td>
        </tr>
        <tr>
          <td colspan="4">
            <div class="similar">
              <ul class="similar-list">
                <li class="listItem">
                  <div class="company"><a href="/Recruit/Co_Read/C/2">추천 회사 1</a></div>
                  <div class="description"><a href="/Recruit/GI_Read/200" data-gno="200">추천 공고 1</a></div>
                </li>
                <li class="listItem">
                  <div class="company"><a href="/Recruit/Co_Read/C/3">추천 회사 2</a></div>
                  <div class="description"><a href="/Recruit/GI_Read/300" data-gno="300">추천 공고 2</a></div>
                </li>
              </ul>
            </div>
          </td>
        </tr>
        <tr>
          <td class="apply-status" rowspan="2">
            <span class="item status">지원완료</span>
            <span class="date">2026.10.01</span>
          </td>
          <td class="company"><a href="/Recruit/Co_Read/C/4">구형 지원 회사</a></td>
          <td class="description"><a href="/Recruit/GI_Read/400">구형 지원 공고</a></td>
          <td><button class="devBtnOldDel" data-idx="8002">지원취소</button></td>
        </tr>
        <tr>
          <td colspan="4">
            <div class="similar">
              <ul class="similar-list">
                <li class="listItem">
                  <div class="company"><a href="/Recruit/Co_Read/C/5">구형 추천 회사</a></div>
                  <div class="description"><a href="/Recruit/GI_Read/500" data-gno="500">구형 추천 공고</a></div>
                </li>
              </ul>
            </div>
          </td>
        </tr>
      </tbody></table>
    `);

    const rows = parseJobkorea(root);

    expect(rows).toHaveLength(2);
    expect(rows.map(row => row.company)).toEqual(['최신 지원 회사', '구형 지원 회사']);
    expect(rows.map(row => row.externalId)).toEqual(['9002', '8002']);
  });

  it('회사명 원본 데이터가 깨져 있어도(괄호 불일치 등) 원문 그대로 저장한다', () => {
    const root = fixture(`
      <table><tbody>
        <tr>
          <td class="company"><a href="/Recruit/GI_Read/789">아타드㈜(ATAD Corp.</a></td>
          <td class="description"><a href="/Recruit/GI_Read/789">디자이너</a></td>
          <td class="apply-status"><span class="item status">지원완료</span></td>
          <td><button class="devBtnDel" data-memname="아타드㈜(ATAD Corp." data-gititle="디자이너" data-applydate="20260101120000" data-idx="7001">지원취소</button></td>
        </tr>
      </tbody></table>
    `);

    const [row] = parseJobkorea(root);
    expect(row.company).toBe('아타드㈜(ATAD Corp.');
  });
});
