import { afterEach, describe, expect, it, vi } from 'vitest';
import { readSaraminMobileDeadlines, supplementSaraminDeadlines } from './saraminDeadlines';
import { convertToApplication } from '../lib/adapter';
import type { ScrapedApplication } from '../types/application';

// 사용자 제공 DOM의 구조만 남기고 실제 회사·지원 ID·추적 정보를 제외했다.
function card(id: string, rec: string, suffix: string) {
  return `<div class="box_apply"><input type="hidden" name="recruitapply_idx" value="${id}">
    <a class="name_company">예시 회사</a><a class="name_job" href="/job-search/view?rec_idx=${rec}&amp;local_code=">
    <span class="txt">프론트엔드 개발자 ${suffix}</span></a>
    <div class="wrap_state">지원 <span class="num">2026-10-22 10:36</span><em class="txt_list">미열람</em></div></div>`;
}
function html(cards: string) { return `<div class="apply_condition"><div class="status_list">${cards}</div></div>`; }
function doc(value: string) { return new DOMParser().parseFromString(value, 'text/html'); }
function row(id = '101', rec = '201'): ScrapedApplication {
  return { company: 'PC 회사', position: 'PC 포지션', platform: 'saramin', status: '지원완료',
    appliedAt: '2026.10.22 10:36', externalId: id, url: `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${rec}` };
}
afterEach(() => { vi.unstubAllGlobals(); });

describe('사람인 모바일 마감일', () => {
  it('명시된 제목 접미사만 추출하고 마감·추천공고·지원일은 제외한다', () => {
    const root = doc(html(card('101', '201', '(~2026-11-01)') + card('102', '202', '(마감)')
      + '<div class="recomm_cont"><a class="name_job"><span class="txt">추천 (~2027-01-01)</span></a></div>'));
    expect([...readSaraminMobileDeadlines(root)]).toEqual([['101:201', '2026-11-01']]);
  });
  it.each(['(~11/01)', '(상시채용)', '(~2026-02-30)', '(~2026-11-01) 다른 내용', '2026-11-01'])('불확실한 제목 %s는 생략한다', (suffix) => {
    expect(readSaraminMobileDeadlines(doc(html(card('101', '201', suffix)))).size).toBe(0);
  });
  it('같은 지원·공고 ID의 날짜 충돌은 생략한다', () => {
    const root = doc(html(card('101', '201', '(~2026-11-01)') + card('101', '201', '(마감)')));
    expect(readSaraminMobileDeadlines(root).size).toBe(0);
  });
  it('지원 ID와 공고 ID가 모두 일치하는 PC 행만 보충하고 원본을 보존한다', async () => {
    const sendMessage = vi.fn(async () => ({ ok: true, html: html(card('101', '201', '(~2026-11-01)')) }));
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    const original = [row(), row('101', '999'), row('999', '201')];
    const result = await supplementSaraminDeadlines(original);
    expect(result.deadlines).toEqual({ matchedCount: 1, lookupFailed: false });
    expect(result.rows[0]).toEqual({ ...original[0], deadlineAt: '2026-11-01' });
    expect(result.rows.slice(1)).toEqual(original.slice(1));
    expect(original[0]).not.toHaveProperty('deadlineAt');
    expect(convertToApplication(result.rows[0]).deadlineAt).toBe('2026-11-01');
    expect(convertToApplication(result.rows[0]).status).toBe('applied');
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
  it.each([{ ok: false }, { ok: true, html: '<div>로그인</div>' }])('모바일 조회 실패·로그인 화면이면 PC 결과를 유지한다', async (response) => {
    vi.stubGlobal('chrome', { runtime: { sendMessage: vi.fn(async () => response) } });
    const original = [row()];
    const result = await supplementSaraminDeadlines(original);
    expect(result.rows).toBe(original);
    expect(result.deadlines).toEqual({ matchedCount: 0, lookupFailed: true });
  });
  it('메시지 연결 실패도 기존 수집을 중단하지 않는다', async () => {
    vi.stubGlobal('chrome', { runtime: { sendMessage: vi.fn().mockRejectedValue(new Error('disconnected')) } });
    const original = [row()];
    expect((await supplementSaraminDeadlines(original)).rows).toBe(original);
  });
  it('PC 결과가 비어 있으면 모바일 요청을 보내지 않는다', async () => {
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    expect(await supplementSaraminDeadlines([])).toEqual({ rows: [] });
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
