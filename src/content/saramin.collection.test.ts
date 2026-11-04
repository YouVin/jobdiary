import { afterEach, expect, it, vi } from 'vitest';
import type { CollectResponse } from '../lib/messages';

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.resetModules();
});

it.each([false, true])('PC 수집→모바일 보충→저장→웹앱 응답 (모바일 실패: %s)', async (mobileFails) => {
  type Listener = (message: unknown, sender: chrome.runtime.MessageSender, reply: (response: unknown) => void) => unknown;
  const listeners: Listener[] = [];
  let external!: Parameters<typeof chrome.runtime.onMessageExternal.addListener>[0];
  let stored: Record<string, unknown> = {};
  const sender: chrome.runtime.MessageSender = { id: 'test-extension', tab: { id: 1 } as chrome.tabs.Tab, frameId: 0,
    url: 'https://www.saramin.co.kr/zf_user/persons/apply-status-list' };
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'test-extension',
      onMessage: { addListener: (listener: typeof listeners[number]) => listeners.push(listener) },
      onMessageExternal: { addListener: (listener: typeof external) => { external = listener; } },
      sendMessage: (message: unknown) => new Promise((resolve) => {
        for (const listener of listeners) if (listener(message, sender, resolve) === true) return;
        resolve(undefined);
      }),
    },
    storage: { local: {
      get: async () => structuredClone(stored),
      set: async (value: Record<string, unknown>) => { stored = structuredClone(value); },
    } },
  });
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    if (input.startsWith('https://m.saramin.co.kr/')) {
      if (mobileFails) throw new Error('mobile login unavailable');
      return new Response(`<div class="apply_condition"><div class="status_list"><div class="box_apply">
        <input name="recruitapply_idx" value="101"><a class="name_job" href="/job-search/view?rec_idx=201">
        <span class="txt">예시 공고 (~2026-11-01)</span></a></div></div></div>`, { headers: { 'content-type': 'text/html' } });
    }
    return new Response('<div>다음 지원현황 페이지는 비어 있음</div>');
  }));
  document.body.innerHTML = `<div class="row _apply_list" data-company_nm="예시 회사" data-rec_division="개발자" data-recruitapply_idx="101">
    <div class="recruit"><a href="https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=201">공고</a></div>
    <div class="col_date">2026.10.22 10:36</div><div class="txt_status">지원완료</div></div>`;
  await import('../background/index');
  await import('./saramin');
  const { COLLECT_MESSAGE_TYPE, EXTERNAL_COLLECT_MESSAGE_TYPE } = await import('../lib/messages');
  const result = await chrome.runtime.sendMessage({ type: COLLECT_MESSAGE_TYPE }) as CollectResponse;
  expect(result.count).toBe(1);
  expect(result.truncated).toBe(false);
  expect(result.deadlines).toEqual({ matchedCount: mobileFails ? 0 : 1, lookupFailed: mobileFails });
  const app = result.applications[0];
  expect(app.company).toBe('예시 회사');
  expect(app.status).toBe('applied');
  if (mobileFails) expect(app).not.toHaveProperty('deadlineAt');
  else expect(app.deadlineAt).toBe('2026-11-01');
  const reply = vi.fn();
  expect(external({ type: EXTERNAL_COLLECT_MESSAGE_TYPE }, { origin: 'https://jobdiary.vercel.app' }, reply)).toBe(true);
  await vi.waitFor(() => expect(reply).toHaveBeenCalledWith({ ok: true, applications: result.applications }));
});
