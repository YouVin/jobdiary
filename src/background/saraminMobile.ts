import { SARAMIN_MOBILE_MESSAGE_TYPE, type SaraminMobileResponse } from '../lib/messages';

export const SARAMIN_MOBILE_URL = 'https://m.saramin.co.kr/apply/state?local_code=&appmode=need_login';
const TIMEOUT_MS = 5000;
const MAX_HTML_LENGTH = 2_000_000;

export async function fetchSaraminMobile(): Promise<SaraminMobileResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // 쿠키/인증 값을 코드로 읽지 않는다. 브라우저가 허용하는 기존 로그인 상태로 요청한다.
    // 로그인 등 다른 URL로의 리다이렉트는 따라가지 않고 선택적 조회를 실패 처리한다.
    const response = await fetch(SARAMIN_MOBILE_URL, {
      credentials: 'include', redirect: 'error', signal: controller.signal,
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return { ok: false };
    const html = await response.text();
    if (html.length > MAX_HTML_LENGTH) return { ok: false };
    return { ok: true, html };
  }
  catch {
    return { ok: false };
  }
  finally {
    clearTimeout(timer);
  }
}

function isSaraminCollector(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id || !sender.tab?.id || !sender.url || sender.frameId !== 0) return false;
  try {
    const url = new URL(sender.url);
    return url.protocol === 'https:'
      && (url.hostname === 'saramin.co.kr' || url.hostname.endsWith('.saramin.co.kr'))
      && url.pathname.startsWith('/zf_user/persons/apply-status-list');
  }
  catch {
    return false;
  }
}

// 임의 URL을 받지 않는 내부 메시지다. 외부 웹앱 요청 채널에서는 이 기능을 제공하지 않는다.
export function registerSaraminMobileHandler(): void {
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (!message || typeof message !== 'object' || !('type' in message)
      || message.type !== SARAMIN_MOBILE_MESSAGE_TYPE || !isSaraminCollector(sender)) return;
    void fetchSaraminMobile().then((result) => {
      try { sendResponse(result); }
      catch { /* 수집 탭이 닫힌 경우 */ }
    });
    return true;
  });
}
