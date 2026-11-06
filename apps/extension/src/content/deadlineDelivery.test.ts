import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScrapedApplication } from '../types/application';
import type { CollectResponse, ExternalCollectResponse } from '../lib/messages';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('마감일 저장·외부 응답 계약', () => {
  it.each([
    ['2026.10.28(수) 23:59', '2026-10-28'],
    ['상시채용', undefined],
    ['2026.02.31', undefined],
    [undefined, undefined],
  ])('파서 입력 %s를 검증한 뒤 저장하고 웹앱에 전달한다', async (raw, expected) => {
    let stored: Record<string, unknown> = {};
    const collectListeners = vi.fn();
    const externalListeners = vi.fn();
    vi.stubGlobal('chrome', {
      runtime: {
        onMessage: { addListener: collectListeners },
        onMessageExternal: { addListener: externalListeners },
      },
      storage: {
        local: {
          get: vi.fn(async () => structuredClone(stored)),
          set: vi.fn(async (value: Record<string, unknown>) => { stored = structuredClone(value); }),
        },
      },
    });

    const { registerCollectHandler } = await import('./collectHandler');
    const { STORAGE_KEY } = await import('../lib/storage');
    const { COLLECT_MESSAGE_TYPE, EXTERNAL_COLLECT_MESSAGE_TYPE } = await import('../lib/messages');
    // 실제 사이트 DOM을 검증한 테스트가 아니다. 파서 이후 공통 경로만 확인한다.
    const row: ScrapedApplication = {
      company: '테스트 회사', position: '개발자', platform: 'jobkorea',
      appliedAt: '2026.10.01', status: '지원완료', deadlineAt: raw,
    };
    registerCollectHandler('jobkorea', async () => ({ rows: [row], truncated: false }));
    const collect = collectListeners.mock.calls[0][0];
    const result = await new Promise<CollectResponse>((resolve) => {
      expect(collect({ type: COLLECT_MESSAGE_TYPE }, {}, resolve)).toBe(true);
    });
    expect(result.count).toBe(1);
    expect(result.applications[0].status).toBe('applied');

    await import('../background/index');
    const external = externalListeners.mock.calls[0][0];
    const response = await new Promise<ExternalCollectResponse>((resolve) => {
      expect(external({ type: EXTERNAL_COLLECT_MESSAGE_TYPE }, { origin: 'https://jobdiary.vercel.app' }, resolve)).toBe(true);
    });
    const saved = (stored[STORAGE_KEY] as { jobkorea: unknown[] }).jobkorea;
    expect(response.ok).toBe(true);
    expect(response.applications).toEqual(saved);
    expect(response.applications).toEqual(result.applications);
    if (expected) expect(response.applications?.[0].deadlineAt).toBe(expected);
    else expect(response.applications?.[0]).not.toHaveProperty('deadlineAt');

    const untrustedResponse = vi.fn();
    expect(external({ type: EXTERNAL_COLLECT_MESSAGE_TYPE }, { origin: 'https://example.com' }, untrustedResponse)).toBeUndefined();
    expect(untrustedResponse).not.toHaveBeenCalled();
  });
});
