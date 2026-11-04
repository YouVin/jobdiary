import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HISTORY_DISPLAY_KEY } from '../lib/historyDisplay';
import { HISTORY_WEBAPP_ORIGIN, historyStorageKey } from '../lib/applicationHistory';
const key = historyStorageKey(HISTORY_WEBAPP_ORIGIN);
const cache = { version: 1, ownerKey: 'a'.repeat(64), syncedAt: '2026-11-04T10:00:00Z',
  entries: [{ platform: 'jobkorea', postingId: '101', state: 'applied' }], unidentifiedCount: 0 };
type Listener = Parameters<typeof chrome.storage.onChanged.addListener>[0];
let listeners: Set<Listener>;
let stored: Record<string, unknown>;
let get: ReturnType<typeof vi.fn>;
async function flush() { await vi.runAllTimersAsync(); }
async function emit(changes: Record<string, chrome.storage.StorageChange>, area: Parameters<Listener>[1] = 'local') {
  for (const listener of listeners) listener(changes, area);
  await flush();
}
beforeEach(() => {
  vi.useFakeTimers(); vi.resetModules();
  vi.stubGlobal('location', { href: 'https://www.jobkorea.co.kr/User/AI' });
  document.body.innerHTML = '<a href="https://www.jobkorea.co.kr/Recruit/GI_Read/101">개발자</a>';
  stored = { [key]: cache }; listeners = new Set();
  get = vi.fn(async () => structuredClone(stored));
  vi.stubGlobal('chrome', { runtime: { id: 'test-extension' }, storage: { local: { get }, onChanged: {
    addListener: (fn: Listener) => listeners.add(fn), removeListener: (fn: Listener) => listeners.delete(fn),
  } } });
});
afterEach(() => {
  window.dispatchEvent(new Event('pagehide'));
  document.body.innerHTML = '';
  vi.unstubAllGlobals(); vi.useRealTimers();
});
it('실제 진입점이 저장 캐시를 읽고 삭제·설정 변경을 모든 탭에 반영한다', async () => {
  await import('./historyBadges'); await flush();
  expect(document.querySelector('[data-jobdiary-history]')).not.toBeNull();
  stored[HISTORY_DISPLAY_KEY] = { enabled: false };
  await emit({ [HISTORY_DISPLAY_KEY]: { newValue: stored[HISTORY_DISPLAY_KEY] } });
  expect(document.querySelector('[data-jobdiary-history]')).toBeNull();
  stored[HISTORY_DISPLAY_KEY] = { enabled: true };
  await emit({ [HISTORY_DISPLAY_KEY]: { newValue: stored[HISTORY_DISPLAY_KEY] } });
  expect(document.querySelector('[data-jobdiary-history]')).not.toBeNull();
  delete stored[key];
  await emit({ [key]: { newValue: undefined } });
  expect(document.querySelector('[data-jobdiary-history]')).toBeNull();
  window.dispatchEvent(new Event('pagehide'));
  expect(listeners.size).toBe(0);
});
it('늦은 초기 캐시 응답이 로그아웃 삭제를 되살리지 않는다', async () => {
  let resolve!: (value: Record<string, unknown>) => void;
  get.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  await import('./historyBadges');
  stored = {};
  await emit({ [key]: { newValue: undefined } });
  resolve({ [key]: cache }); await flush();
  expect(document.querySelector('[data-jobdiary-history]')).toBeNull();
});
it('수집 슬롯·다른 origin·다른 저장 영역 변경에는 다시 읽지 않는다', async () => {
  await import('./historyBadges'); await flush();
  const calls = get.mock.calls.length;
  await emit({ 'jobdiary:collected': { newValue: {} } });
  await emit({ [historyStorageKey('https://jobdiary.vercel.app')]: { newValue: cache } });
  await emit({ [key]: { newValue: cache } }, 'sync');
  expect(get).toHaveBeenCalledTimes(calls);
});
it('저장소 조회 실패와 무효 캐시는 표시하지 않는다', async () => {
  get.mockRejectedValueOnce(new Error('storage unavailable'));
  await import('./historyBadges'); await flush();
  expect(document.querySelector('[data-jobdiary-history]')).toBeNull();
  stored[key] = { ...cache, version: 999 };
  await emit({ [key]: { newValue: stored[key] } });
  expect(document.querySelector('[data-jobdiary-history]')).toBeNull();
});

it('페이지 복귀는 예전 표시를 먼저 비우고 최신 저장소를 읽은 뒤 표시한다', async () => {
  await import('./historyBadges'); await flush();
  expect(document.querySelector('[data-jobdiary-history]')).not.toBeNull();
  let resolve!: (value: Record<string, unknown>) => void;
  get.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  window.dispatchEvent(new Event('pageshow'));
  await flush();
  expect(document.querySelector('[data-jobdiary-history]')).toBeNull();
  resolve({}); await flush();
  expect(document.querySelector('[data-jobdiary-history]')).toBeNull();
});

it('숨겨진 탭은 저장소 구독·조회도 중단하고 복귀 시 최신 캐시를 읽는다', async () => {
  const original = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  try {
    await import('./historyBadges'); await flush();
    expect(listeners.size).toBe(1);
    const calls = get.mock.calls.length;
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange')); await flush();
    expect(listeners.size).toBe(0);
    expect(document.querySelector('[data-jobdiary-history]')).toBeNull();
    stored = {};
    await emit({ [key]: { newValue: undefined } });
    expect(get).toHaveBeenCalledTimes(calls);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange')); await flush();
    expect(listeners.size).toBe(1);
    expect(document.querySelector('[data-jobdiary-history]')).toBeNull();
  } finally {
    if (original) Object.defineProperty(document, 'visibilityState', original);
    else Reflect.deleteProperty(document, 'visibilityState');
  }
});

it('저장소 API가 이미 사라진 탭에서는 예외 없이 중단한다', async () => {
  const original = chrome;
  try {
    vi.stubGlobal('chrome', { runtime: { id: undefined } });
    await expect(import('./historyBadges')).resolves.toBeDefined();
    await flush();
    expect(get).not.toHaveBeenCalled();
    expect(document.querySelector('[data-jobdiary-history]')).toBeNull();
  } finally { vi.stubGlobal('chrome', original); }
});

it('확장 연결이 끊긴 뒤 pagehide는 캡처한 구독을 정리하고 반복 종료에도 안전하다', async () => {
  const original = chrome;
  const add = vi.spyOn(window, 'addEventListener');
  try {
    await import('./historyBadges'); await flush();
    const hide = add.mock.calls.find(([name]) => name === 'pagehide')![1] as EventListener;
    vi.stubGlobal('chrome', { runtime: { id: undefined } });
    expect(() => hide(new Event('pagehide'))).not.toThrow();
    expect(listeners.size).toBe(0);
    expect(document.querySelector('[data-jobdiary-history]')).toBeNull();
    expect(() => hide(new Event('pagehide'))).not.toThrow();
  } finally { vi.stubGlobal('chrome', original); add.mockRestore(); }
});

it('컨텍스트가 사라진 뒤 도착한 캐시 응답으로 배지를 되살리지 않는다', async () => {
  const original = chrome;
  let resolve!: (value: Record<string, unknown>) => void;
  get.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  try {
    await import('./historyBadges');
    vi.stubGlobal('chrome', { runtime: { id: undefined } });
    resolve({ [key]: cache }); await flush();
    expect(document.querySelector('[data-jobdiary-history]')).toBeNull();
    expect(listeners.size).toBe(0);
  } finally { vi.stubGlobal('chrome', original); }
});

it('구독 등록이 무효 컨텍스트 오류를 던져도 종료하고 다시 시작하지 않는다', async () => {
  const add = vi.spyOn(chrome.storage.onChanged, 'addListener').mockImplementation(() => { throw new Error('Extension context invalidated.'); });
  try {
    await expect(import('./historyBadges')).resolves.toBeDefined();
    window.dispatchEvent(new Event('pageshow')); await flush();
    expect(add).toHaveBeenCalledTimes(1);
    expect(get).not.toHaveBeenCalled();
  } finally { add.mockRestore(); }
});

it('구독 해제가 오류를 던져도 DOM과 이벤트를 정리하고 늦은 변경을 무시한다', async () => {
  const add = vi.spyOn(window, 'addEventListener');
  let remove: ReturnType<typeof vi.spyOn> | undefined;
  try {
    await import('./historyBadges'); await flush();
    const hide = add.mock.calls.find(([name]) => name === 'pagehide')![1] as EventListener;
    remove = vi.spyOn(chrome.storage.onChanged, 'removeListener').mockImplementation(() => { throw new Error('Extension context invalidated.'); });
    const calls = get.mock.calls.length;
    expect(() => hide(new Event('pagehide'))).not.toThrow();
    expect(document.querySelector('[data-jobdiary-history]')).toBeNull();
    await emit({ [key]: { newValue: cache } });
    window.dispatchEvent(new Event('pageshow')); await flush();
    expect(get).toHaveBeenCalledTimes(calls);
  } finally { remove?.mockRestore(); add.mockRestore(); }
});

it('조회가 컨텍스트 무효화로 거절되면 구독을 종료하고 다시 조회하지 않는다', async () => {
  get.mockRejectedValueOnce(new Error('Extension context invalidated.'));
  await import('./historyBadges'); await flush();
  expect(listeners.size).toBe(0);
  expect(document.querySelector('[data-jobdiary-history]')).toBeNull();
  window.dispatchEvent(new Event('pageshow')); await flush();
  expect(get).toHaveBeenCalledTimes(1);
});
