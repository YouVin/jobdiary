import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSaraminMobile, registerSaraminMobileHandler, SARAMIN_MOBILE_URL } from './saraminMobile';
import { SARAMIN_MOBILE_MESSAGE_TYPE } from '../lib/messages';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('사람인 모바일 요청 경계', () => {
  it('고정 URL만 조회하며 응답 HTML을 반환한다', async () => {
    const fetchMock = vi.fn(async () => new Response('<div>mobile</div>', { headers: { 'content-type': 'text/html; charset=utf-8' } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchSaraminMobile()).toEqual({ ok: true, html: '<div>mobile</div>' });
    expect(fetchMock).toHaveBeenCalledWith(SARAMIN_MOBILE_URL, expect.objectContaining({ credentials: 'include', redirect: 'error' }));
  });
  it.each([new Response('', { status: 403 }), new Response('{}', { headers: { 'content-type': 'application/json' } })])('오류 응답과 HTML 아닌 응답은 실패로 반환한다', async (response) => {
    vi.stubGlobal('fetch', vi.fn(async () => response));
    expect(await fetchSaraminMobile()).toEqual({ ok: false });
  });
  it('시간 초과 후 요청을 중단하고 타이머를 정리한다', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    })));
    const pending = fetchSaraminMobile();
    await vi.advanceTimersByTimeAsync(5000);
    expect(await pending).toEqual({ ok: false });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('다른 확장·외부 사이트·팝업·iframe에서는 요청을 허용하지 않는다', async () => {
    const addListener = vi.fn();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => new Response('ok', { headers: { 'content-type': 'text/html' } }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('chrome', { runtime: { id: 'our-extension', onMessage: { addListener } } });
    registerSaraminMobileHandler();
    const listener = addListener.mock.calls[0][0];
    const sender = { id: 'our-extension', tab: { id: 1 }, frameId: 0, url: 'https://www.saramin.co.kr/zf_user/persons/apply-status-list' };
    const reply = vi.fn();
    for (const invalid of [
      { ...sender, id: 'other' }, { ...sender, tab: undefined }, { ...sender, frameId: 1 },
      { ...sender, url: 'https://example.com/zf_user/persons/apply-status-list' },
      { ...sender, url: 'https://www.saramin.co.kr/jobs' }, { ...sender, url: 'not-a-url' },
    ]) expect(listener({ type: SARAMIN_MOBILE_MESSAGE_TYPE }, invalid, reply)).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(reply).not.toHaveBeenCalled();
    expect(listener({ type: SARAMIN_MOBILE_MESSAGE_TYPE, url: 'https://example.com' }, sender, reply)).toBe(true);
    await vi.waitFor(() => expect(reply).toHaveBeenCalledWith({ ok: true, html: 'ok' }));
    expect(fetchMock.mock.calls[0][0]).toBe(SARAMIN_MOBILE_URL);
  });
});
