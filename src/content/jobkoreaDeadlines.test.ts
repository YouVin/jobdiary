import { afterEach, describe, expect, it, vi } from 'vitest';
import { jobkoreaPosting, readJobkoreaPostingDeadline, supplementJobkoreaDeadlines } from './jobkoreaDeadlines';
import { convertToApplication } from '../lib/adapter';
import type { ScrapedApplication } from '../types/application';

// 공개 공고의 실제 JSON-LD/메타 구조를 재현하되 공고 ID/본문은 예시로 치환한다.
function fixture(id = '101', display = '2026.10.31', validThrough = '2026-10-31T23:59') {
  return `<head><meta name="description" content="경력 : 신입·경력 , 학력 : 대졸↑, 마감일 : ${display}">
    <script type="application/ld+json">${JSON.stringify({ '@type': 'JobPosting',
      url: `https://www.jobkorea.co.kr/Recruit/GI_Read/${id}`,
      identifier: { '@type': 'PropertyValue', name: 'JobKorea', value: id }, validThrough })}</script></head>`;
}
function doc(html: string) { return new DOMParser().parseFromString(html, 'text/html'); }
function row(id = '101', deadlineAt = '(~10/31)'): ScrapedApplication {
  return { company: '예시 회사', position: '개발자', platform: 'jobkorea', status: '지원완료',
    appliedAt: '2026.10.21', externalId: `apply-${id}`, deadlineAt,
    url: `https://www.jobkorea.co.kr/Recruit/GI_Read/${id}?Oem_Code=C1` };
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('잡코리아 공고 마감일 검증', () => {
  it('공고 식별자와 메타 설명·validThrough가 모두 일치해야 날짜를 반환한다', () => {
    expect(readJobkoreaPostingDeadline(doc(fixture()), '101')).toBe('2026-10-31');
    expect(readJobkoreaPostingDeadline(doc(fixture()), '999')).toBeUndefined();
  });
  it('상시채용에 실제 validThrough가 있어도 마감일로 쓰지 않는다', () => {
    expect(readJobkoreaPostingDeadline(doc(fixture('101', '상시채용', '2027-08-30T15:00')), '101')).toBeUndefined();
  });
  it.each([
    ['2026.10.31', '2026-11-01T23:59'], ['2026.02.31', '2026-02-31T23:59'],
    ['10.31', '2026-10-31T23:59'], ['2026.10.31', '2026-10-31T25:00'],
  ])('표시 %s와 구조화 날짜 %s가 불일치/무효면 생략한다', (display, validThrough) => {
    expect(readJobkoreaPostingDeadline(doc(fixture('101', display, validThrough)), '101')).toBeUndefined();
  });
  it('JSON 오류·메타 설명만 있는 경우·다른 호스트의 공고는 생략한다', () => {
    expect(readJobkoreaPostingDeadline(doc('<meta name="description" content="마감일 : 2026.10.31"><script type="application/ld+json">broken</script>'), '101')).toBeUndefined();
    expect(readJobkoreaPostingDeadline(doc(fixture().replace('www.jobkorea.co.kr', 'example.com')), '101')).toBeUndefined();
  });
  it.each(['http://www.jobkorea.co.kr/Recruit/GI_Read/101', 'https://example.com/Recruit/GI_Read/101',
    'https://www.jobkorea.co.kr/User/101', 'https://user:pass@www.jobkorea.co.kr/Recruit/GI_Read/101', 'not-a-url'])('외부/임의 경로 %s는 거부한다', (url) => {
    expect(jobkoreaPosting(url)).toBeUndefined();
  });
});

describe('잡코리아 선택적 보충', () => {
  it('중복 공고는 한 번 조회하고 일치하는 지원만 보충하며 상시는 조회하지 않는다', async () => {
    const fetchMock = vi.fn(async () => new Response(fixture(), { headers: { 'content-type': 'text/html' } }));
    vi.stubGlobal('fetch', fetchMock);
    const original = [row(), { ...row(), externalId: 'other-apply' }, row('102', '(상시)')];
    const result = await supplementJobkoreaDeadlines(original);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://www.jobkorea.co.kr/Recruit/GI_Read/101', expect.objectContaining({ credentials: 'omit', redirect: 'error' }));
    expect(result.deadlines).toEqual({ matchedCount: 2, lookupFailed: false });
    expect(result.rows[2]).toBe(original[2]);
    expect(original[0].deadlineAt).toBe('(~10/31)');
    expect(convertToApplication(result.rows[0]).deadlineAt).toBe('2026-10-31');
    expect(convertToApplication(result.rows[0]).status).toBe('applied');
  });
  it('한 공고 조회가 실패해도 성공한 날짜와 모든 PC 지원내역을 유지한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/102')) throw new Error('unavailable');
      return new Response(fixture(), { headers: { 'content-type': 'text/html' } });
    }));
    const original = [row(), row('102')];
    const result = await supplementJobkoreaDeadlines(original);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].deadlineAt).toBe('2026-10-31');
    expect(result.rows[1]).toBe(original[1]);
    expect(result.deadlines).toEqual({ matchedCount: 1, lookupFailed: true });
  });
  it('공고가 많아도 최대 10개만 요청하고 PC 내역은 전부 유지한다', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await supplementJobkoreaDeadlines(Array.from({ length: 12 }, (_, i) => row(String(i + 101))));
    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(result.rows).toHaveLength(12);
    expect(result.deadlines?.lookupFailed).toBe(true);
  });
  it('시간 초과는 기존 데이터를 유지하고 타이머를 정리한다', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    })));
    const original = [row()];
    const pending = supplementJobkoreaDeadlines(original);
    await vi.advanceTimersByTimeAsync(4000);
    const result = await pending;
    expect(result.rows[0]).toBe(original[0]);
    expect(result.deadlines?.lookupFailed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('빈 지원 목록에는 추가 조회를 하지 않는다', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await supplementJobkoreaDeadlines([])).toEqual({ rows: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
