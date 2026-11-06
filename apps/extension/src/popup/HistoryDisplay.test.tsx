import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { HISTORY_DISPLAY_KEY } from '../lib/historyDisplay';
import { HISTORY_WEBAPP_ORIGIN, historyStorageKey } from '../lib/applicationHistory';
const key = historyStorageKey(HISTORY_WEBAPP_ORIGIN);
type Listener = Parameters<typeof chrome.storage.onChanged.addListener>[0];
let listeners: Set<Listener>;
let stored: Record<string, unknown>;
let root: Root;
let container: HTMLDivElement;
let set: ReturnType<typeof vi.fn>;
let createTab: ReturnType<typeof vi.fn>;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  listeners = new Set();
  stored = { [key]: { version: 1, ownerKey: 'a'.repeat(64), syncedAt: '2026-11-04T10:00:00Z',
    entries: [{ platform: 'jobkorea', postingId: '101', state: 'applied' }], unidentifiedCount: 2 } };
  set = vi.fn(async (values: Record<string, unknown>) => {
    Object.assign(stored, values);
    listeners.forEach(listener => listener(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { newValue: v }])), 'local'));
  });
  createTab = vi.fn(async () => ({}));
  vi.stubGlobal('chrome', { tabs: { create: createTab, query: async () => [{ id: 1, url: 'https://www.jobkorea.co.kr/User/AI' }] }, storage: {
    local: { get: async () => structuredClone(stored), set },
    onChanged: { addListener: (fn: Listener) => listeners.add(fn), removeListener: (fn: Listener) => listeners.delete(fn) },
  } });
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
it('공고 수·동기화·미식별 상태와 자동 표시 설정을 안내하고 저장한다', async () => {
  await act(async () => root.render(<App />));
  expect(container.textContent).toContain('1개 공고 연결');
  expect(container.textContent).toContain('미확인 2건 제외');
  const checkbox = container.querySelector<HTMLInputElement>('#history-display-enabled')!;
  expect(checkbox.checked).toBe(true);
  await act(async () => checkbox.click());
  expect(set).toHaveBeenCalledWith({ [HISTORY_DISPLAY_KEY]: { enabled: false } });
  expect(checkbox.checked).toBe(false);
  expect(stored[key]).toBeDefined();
});
it('설정 저장이 실패하면 기존 설정을 유지하고 오류를 알린다', async () => {
  set.mockRejectedValueOnce(new Error('write failed'));
  await act(async () => root.render(<App />));
  const checkbox = container.querySelector<HTMLInputElement>('#history-display-enabled')!;
  await act(async () => checkbox.click());
  expect(checkbox.checked).toBe(true);
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('설정을 저장하지 못했어요');
});
it('캐시 삭제를 미지원 전체로 설명하지 않고 로그인 안내로 바꾼다', async () => {
  await act(async () => root.render(<App />));
  delete stored[key];
  await act(async () => { listeners.forEach(listener => listener({ [key]: { newValue: undefined } }, 'local')); });
  expect(container.textContent).toContain('로그인 후 지원 이력을 연결하세요.');
  expect(container.textContent).not.toContain('1개 공고 연결');
});

it('이력 갱신은 자동 가져오기 신호 없이 웹앱을 연다', async () => {
  await act(async () => root.render(<App />));
  const open = [...container.querySelectorAll('button')].find(button => button.textContent === '이력 갱신')!;
  await act(async () => open.click());
  expect(createTab).toHaveBeenCalledWith({ url: 'http://localhost:3000' });
  expect(stored[key]).toBeDefined();
});

it('미연결 안내는 연결 버튼을 제공하고 기존 수집을 다시 가져오지 않는다', async () => {
  delete stored[key];
  await act(async () => root.render(<App />));
  const open = [...container.querySelectorAll('button')].find(button => button.textContent === '취준일기에서 연결')!;
  await act(async () => open.click());
  expect(createTab).toHaveBeenCalledWith({ url: 'http://localhost:3000' });
  expect(container.textContent).toContain('로그인 후 지원 이력을 연결하세요.');
  expect(container.querySelector('.diary-history-meta')).toBeNull();
});
