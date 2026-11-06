import { afterEach, describe, expect, it, vi } from 'vitest';
import { HISTORY_CLEAR_TYPE, HISTORY_SYNC_TYPE, HISTORY_PROTOCOL_VERSION } from '@jobdiary/shared';
const origin = 'http://localhost:3000';
const request = { type: HISTORY_SYNC_TYPE, version: HISTORY_PROTOCOL_VERSION,
  snapshot: { ownerKey: 'a'.repeat(64), entries: [{ platform: 'jobkorea' as const, postingId: '101', state: 'applied' as const }], unidentifiedCount: 1 } };
function fixture() {
  const stored: Record<string, unknown> = { 'jobdiary:collected': { saramin: [{ company: '수집 슬롯' }] } };
  const listeners: Array<(...args: unknown[]) => unknown> = [];
  vi.stubGlobal('chrome', {
    runtime: { onMessage: { addListener() {} }, onMessageExternal: { addListener: (fn: typeof listeners[number]) => listeners.push(fn) } },
    storage: { local: { get: vi.fn(async (key: string) => ({ [key]: structuredClone(stored[key]) })),
      set: vi.fn(async (values: Record<string, unknown>) => { Object.assign(stored, structuredClone(values)); }),
      remove: vi.fn(async (key: string) => { delete stored[key]; }) } },
  });
  return { stored, listeners };
}
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
describe('지원 이력 캐시', () => {
  it('원본 수집 슬롯과 분리하고 origin별로 격리해 저장·삭제한다', async () => {
    const { stored } = fixture();
    const { applyHistoryRequest, getApplicationHistory } = await import('./applicationHistory');
    expect((await applyHistoryRequest(origin, request)).ok).toBe(true);
    await applyHistoryRequest('https://jobdiary.vercel.app', { ...request, snapshot: { ...request.snapshot, ownerKey: 'b'.repeat(64) } });
    expect((await getApplicationHistory(origin))?.entries).toEqual(request.snapshot.entries);
    await applyHistoryRequest(origin, { type: HISTORY_CLEAR_TYPE, version: 1 });
    expect(await getApplicationHistory(origin)).toBeNull();
    expect((await getApplicationHistory('https://jobdiary.vercel.app'))?.ownerKey).toBe('b'.repeat(64));
    expect(stored['jobdiary:collected']).toEqual({ saramin: [{ company: '수집 슬롯' }] });
  });
  it('저장 중 clear가 도착해도 오래된 snapshot이 되살아나지 않는다', async () => {
    fixture();
    const { applyHistoryRequest, getApplicationHistory } = await import('./applicationHistory');
    const writing = applyHistoryRequest(origin, request);
    const clearing = applyHistoryRequest(origin, { type: HISTORY_CLEAR_TYPE, version: 1 });
    await Promise.all([writing, clearing]);
    expect(await getApplicationHistory(origin)).toBeNull();
  });
  it('service worker가 재시작돼도 저장한 캐시를 읽는다', async () => {
    fixture();
    const first = await import('./applicationHistory');
    await first.applyHistoryRequest(origin, request);
    vi.resetModules();
    const second = await import('./applicationHistory');
    expect((await second.getApplicationHistory(origin))?.entries).toEqual(request.snapshot.entries);
  });
  it('수집 데이터 초기화로 비교 캐시가 지워지지 않는다', async () => {
    fixture();
    const cache = await import('./applicationHistory');
    await cache.applyHistoryRequest(origin, request);
    await (await import('./storage')).clearAll();
    expect((await cache.getApplicationHistory(origin))?.entries.length).toBe(1);
  });
  it('storage 실패는 명시적 실패 응답이며 이후 clear 요청은 처리한다', async () => {
    fixture();
    vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error('quota'));
    const cache = await import('./applicationHistory');
    expect((await cache.applyHistoryRequest(origin, request)).ok).toBe(false);
    expect((await cache.applyHistoryRequest(origin, { type: HISTORY_CLEAR_TYPE, version: 1 })).ok).toBe(true);
  });
  it('외부 origin·하위 프레임·잘못된 버전을 거부하고 정상 요청을 저장한다', async () => {
    const { listeners } = fixture();
    await import('../background/index');
    const receive = listeners[0];
    const denied = vi.fn();
    expect(receive(request, { origin: 'https://evil.test', frameId: 0 }, denied)).toBeUndefined();
    expect(receive(request, { origin, frameId: 1 }, denied)).toBeUndefined();
    expect(denied).not.toHaveBeenCalled();
    const invalid = vi.fn();
    receive({ ...request, version: 2 }, { origin, frameId: 0 }, invalid);
    expect(invalid).toHaveBeenCalledWith({ ok: false, error: 'invalid-history-message' });
    const result = await new Promise<unknown>(resolve => receive(request, { origin, frameId: 0 }, resolve));
    expect(result).toMatchObject({ ok: true, version: 1, entryCount: 1 });
  });
});
