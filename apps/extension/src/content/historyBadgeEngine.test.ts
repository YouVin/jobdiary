import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HistoryCache, HistoryEntry } from '@jobdiary/shared';
import { createHistoryAnnotator } from './historyBadgeEngine';

const marker = '[data-jobdiary-history]';
const link = (id: string, text = '개발자') => '<a href="https://www.jobkorea.co.kr/Recruit/GI_Read/' + id + '">' + text + '</a>';
const entry = (id: string, state: HistoryEntry['state'] = 'applied'): HistoryEntry => ({ platform: 'jobkorea', postingId: id, state });
const cache = (entries: HistoryEntry[]): HistoryCache => ({ version: 1, ownerKey: 'a'.repeat(64), syncedAt: '2026-11-04T10:00:00Z', entries, unidentifiedCount: 0 });
let engine: ReturnType<typeof createHistoryAnnotator>;
async function flush() { await vi.runAllTimersAsync(); }
beforeEach(() => { vi.useFakeTimers(); document.body.innerHTML = ''; engine = createHistoryAnnotator(document, 'jobkorea', () => 'https://www.jobkorea.co.kr/User/AI'); });
afterEach(() => { engine.dispose(); document.body.innerHTML = ''; vi.useRealTimers(); });

describe('지원 이력 배지 엔진', () => {
  it('정확한 ID만 표시하고 취소를 구분하며 원래 링크 텍스트·주소를 보존한다', async () => {
    document.body.innerHTML = link('101') + link('102') + link('103');
    engine.update(cache([entry('101'), entry('102', 'canceled')]));
    await flush();
    expect(document.querySelectorAll(marker)).toHaveLength(2);
    const anchors = [...document.querySelectorAll('a')];
    expect(anchors.map(a => a.textContent)).toEqual(['개발자', '개발자', '개발자']);
    expect(anchors[0].querySelector(marker)?.getAttribute('aria-label')).toContain('지원 이력 있음');
    expect(anchors[1].querySelector(marker)?.getAttribute('aria-label')).toContain('지원취소 이력');
    expect(anchors[2].querySelector(marker)).toBeNull();
    expect(anchors[0].href).toBe('https://www.jobkorea.co.kr/Recruit/GI_Read/101');
    expect(anchors[0].querySelector(marker)?.shadowRoot).toBeNull();
  });
  it('이름만 같거나 다른 플랫폼·다른 호스트·이미지만 있는 링크는 표시하지 않는다', async () => {
    document.body.innerHTML = link('999') + '<a href="https://www.wanted.co.kr/wd/101">개발자</a>'
      + '<a href="https://www.jobkorea.co.kr.evil.test/Recruit/GI_Read/101">개발자</a>'
      + '<a href="https://www.jobkorea.co.kr/Recruit/GI_Read/101"><img alt="개발자"></a>';
    engine.update(cache([entry('101')]));
    await flush();
    expect(document.querySelectorAll(marker)).toHaveLength(0);
  });
  it('자기 DOM 변경으로 반복 검사하거나 같은 캐시에 배지를 중복 삽입하지 않는다', async () => {
    document.body.innerHTML = link('101');
    const data = cache([entry('101')]);
    engine.update(data); await flush();
    const badge = document.querySelector(marker);
    const stats = engine.getStats();
    engine.update({ ...data, syncedAt: '2026-11-04T11:00:00Z' }); await flush();
    expect(document.querySelectorAll(marker)).toHaveLength(1);
    expect(document.querySelector(marker)).toBe(badge);
    expect(engine.getStats().examinedLinks).toBe(stats.examinedLinks);
    expect(engine.getStats().flushes).toBe(stats.flushes);
    expect(engine.getStats().queuedRoots).toBe(0);
  });
  it('추가된 영역만 처리하고 href가 바뀐 가상 목록 노드의 오래된 표시를 지운다', async () => {
    document.body.innerHTML = link('101');
    engine.update(cache([entry('101'), entry('102', 'canceled')])); await flush();
    const before = engine.getStats().examinedLinks;
    const row = document.createElement('div'); row.innerHTML = link('102'); document.body.append(row);
    await flush();
    expect(engine.getStats().examinedLinks - before).toBe(1);
    const anchor = row.querySelector('a')!;
    anchor.href = 'https://www.jobkorea.co.kr/Recruit/GI_Read/999'; await flush();
    expect(anchor.querySelector(marker)).toBeNull();
    anchor.href = 'https://www.jobkorea.co.kr/Recruit/GI_Read/101'; await flush();
    expect(anchor.querySelector(marker)?.getAttribute('aria-label')).toContain('지원 이력 있음');
  });
  it('삭제된 영역의 배지 참조를 정리한다', async () => {
    const row = document.createElement('div'); row.innerHTML = link('101'); document.body.append(row);
    engine.update(cache([entry('101')])); await flush();
    row.remove(); await flush();
    expect(engine.getStats().liveBadges).toBe(0);
    expect(engine.getStats().queuedRoots).toBe(0);
  });
  it('캐시 삭제·자동 표시 끄기는 배지와 observer를 정리하고 켜면 다시 표시한다', async () => {
    document.body.innerHTML = link('101');
    const data = cache([entry('101')]);
    engine.update(data); await flush();
    engine.update(data, false); await flush();
    expect(document.querySelector(marker)).toBeNull();
    expect(engine.getStats().observing).toBe(false);
    engine.update(data, true); await flush();
    expect(document.querySelector(marker)).not.toBeNull();
    engine.update(null); await flush();
    expect(document.querySelector(marker)).toBeNull();
    expect(engine.getStats().observing).toBe(false);
  });
  it('비활성 탭은 예약 작업·배지·observer를 비우고 복귀 시 현재 DOM을 검사한다', async () => {
    document.body.innerHTML = link('101');
    engine.update(cache([entry('101')])); await flush();
    engine.setVisible(false);
    document.body.insertAdjacentHTML('beforeend', link('101'));
    await flush();
    expect(engine.getStats().observing).toBe(false);
    expect(engine.getStats().queuedRoots).toBe(0);
    expect(document.querySelectorAll(marker)).toHaveLength(0);
    engine.setVisible(true); await flush();
    expect(document.querySelectorAll(marker)).toHaveLength(2);
  });
  it('상세 URL의 일치와 하나의 비어 있지 않은 h1이 있을 때만 제목에 표시한다', async () => {
    engine.dispose();
    let url = 'https://www.jobkorea.co.kr/Recruit/GI_Read/101';
    engine = createHistoryAnnotator(document, 'jobkorea', () => url);
    document.body.innerHTML = '<h1></h1><h1>개발자 상세</h1>';
    engine.update(cache([entry('101')])); await flush();
    expect(document.querySelector('[data-jobdiary-history="detail"]')).not.toBeNull();
    expect(document.querySelectorAll('h1')[1].textContent).toBe('개발자 상세');
    url = 'https://www.jobkorea.co.kr/Recruit/GI_Read/999'; engine.pageChanged(); await flush();
    expect(document.querySelector(marker)).toBeNull();
  });
  it('여러 제목의 상세 화면은 위치를 추측하지 않는다', async () => {
    engine.dispose(); engine = createHistoryAnnotator(document, 'jobkorea', () => 'https://www.jobkorea.co.kr/Recruit/GI_Read/101');
    document.body.innerHTML = '<h1>제목 1</h1><h1>제목 2</h1>';
    engine.update(cache([entry('101')])); await flush();
    expect(document.querySelector(marker)).toBeNull();
  });
  it('빠른 정상 상태 변경은 반복 삽입 방지에 막히지 않는다', async () => {
    document.body.innerHTML = link('101');
    for (const state of ['applied', 'canceled', 'applied', 'canceled', 'applied'] as const) {
      engine.update(cache([entry('101', state)])); await flush();
      expect(document.querySelector(marker)?.getAttribute('aria-label')).toContain(state === 'applied' ? '지원 이력 있음' : '지원취소 이력');
    }
  });
  it('사이트가 배지를 계속 삭제하면 재삽입을 제한한다', async () => {
    document.body.innerHTML = link('101');
    engine.update(cache([entry('101')])); await flush();
    for (let i = 0; i < 4; i++) { document.querySelector(marker)?.remove(); await flush(); }
    expect(document.querySelector(marker)).toBeNull();
    expect(engine.getStats().queuedRoots).toBe(0);
  });
  it('사람인 링크도 rec_idx로 식별하고 같은 ID의 잡코리아 이력과 섞지 않는다', async () => {
    engine.dispose(); engine = createHistoryAnnotator(document, 'saramin');
    document.body.innerHTML = '<a href="https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=101">개발자</a>';
    engine.update(cache([{ platform: 'saramin', postingId: '101', state: 'applied' }])); await flush();
    expect(document.querySelector(marker)).not.toBeNull();
    engine.update(cache([entry('101')])); await flush();
    expect(document.querySelector(marker)).toBeNull();
  });
  it('캐시가 없으면 긴 페이지도 검사하거나 observer를 연결하지 않는다', async () => {
    document.body.innerHTML = Array.from({ length: 1000 }, (_, i) => link(String(i + 1))).join('');
    engine.update(null); await flush();
    expect(engine.getStats().visitedNodes).toBe(0);
    expect(engine.getStats().observing).toBe(false);
  });
});

it('초기 순회 도중 제거된 큰 목록을 계속 붙잡지 않고 남은 영역을 검사한다', async () => {
  const rows = document.createElement('div');
  rows.innerHTML = Array.from({ length: 2000 }, () => link('101')).join('');
  document.body.append(rows);
  document.body.insertAdjacentHTML('beforeend', '<footer>' + link('102', '남은 공고') + '</footer>');
  engine.update(cache([entry('101'), entry('102')]));
  await vi.advanceTimersByTimeAsync(16);
  expect(engine.getStats().queuedRoots).toBeGreaterThan(0);
  const before = engine.getStats().visitedNodes;
  rows.remove();
  await flush();
  expect(document.querySelector('footer ' + marker)).not.toBeNull();
  expect(engine.getStats().liveBadges).toBe(1);
  expect(engine.getStats().visitedNodes - before).toBeLessThan(20);
});

it('편집 가능한 영역의 공고 링크는 표시하지 않는다', async () => {
  document.body.innerHTML = '<div contenteditable>' + link('101') + '</div><div contenteditable="plaintext-only">' + link('101') + '</div>';
  engine.update(cache([entry('101')])); await flush();
  expect(document.querySelector('[data-jobdiary-history]')).toBeNull();
});

it('잡코리아 실제 파서의 결과는 배지 표시 전후 동일하다', async () => {
  const { parseJobkorea } = await import('./jobkorea');
  document.body.innerHTML = '<table><tbody><tr><td><button data-memname="예시 회사" data-gititle="개발자" data-applydate="20261101120000" data-idx="apply-101"></button></td><td class="description">' + link('101') + '</td><td class="apply-status"><span class="item status">지원완료</span></td></tr></tbody></table>';
  const before = parseJobkorea();
  expect(before).toHaveLength(1);
  engine.update(cache([entry('101')])); await flush();
  expect(document.querySelector('[data-jobdiary-history]')).not.toBeNull();
  expect(parseJobkorea()).toEqual(before);
});
it('사람인 실제 파서의 결과는 배지 표시 전후 동일하다', async () => {
  const { parseSaramin } = await import('./saramin');
  engine.dispose(); engine = createHistoryAnnotator(document, 'saramin');
  document.body.innerHTML = '<div class="row _apply_list" data-company_nm="예시 회사" data-rec_division="개발자" data-recruitapply_idx="apply-201"><div class="recruit"><a href="https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=201">개발자</a></div><div class="col_date">2026.11.01 12:00</div><div class="txt_status">지원완료</div></div>';
  const before = parseSaramin();
  expect(before).toHaveLength(1);
  engine.update(cache([{ platform: 'saramin', postingId: '201', state: 'applied' }])); await flush();
  expect(document.querySelector('[data-jobdiary-history]')).not.toBeNull();
  expect(parseSaramin()).toEqual(before);
});
