import type { Platform } from '@/types/application';

// 수집 전용 content_scripts.matches와 같은 사이트·경로 범위를 유지한다.
// 표시 전용 스크립트는 아래 detectHistoryPlatform으로 별도 검사한다.
// manifest.config.ts의 수집 경로가 바뀌면 함께 확인한다
// (그쪽이 바뀌면 여기도 같이 바꿔야 한다). host_permissions는 오리진 단위라 경로 정보가
// 없으므로 동기화 대상이 아니다 — 실제 경로 제한(및 여기와의 동기화)은 content_scripts만 담당:
//   사람인:   https://*.saramin.co.kr/zf_user/persons/apply-status-list*
//   잡코리아: https://(www.)jobkorea.co.kr/User/*
//   원티드:   https://(www.)wanted.co.kr/status/*
export function detectPlatform(url: string | undefined): Platform | undefined {
  if (!url) return undefined;

  let hostname: string;
  let pathname: string;
  try {
    ({ hostname, pathname } = new URL(url));
  } catch {
    return undefined;
  }

  if ((hostname === 'saramin.co.kr' || hostname.endsWith('.saramin.co.kr')) && pathname.startsWith('/zf_user/persons/apply-status-list')) {
    return 'saramin';
  }
  if ((hostname === 'jobkorea.co.kr' || hostname === 'www.jobkorea.co.kr') && pathname.startsWith('/User/')) {
    return 'jobkorea';
  }
  if ((hostname === 'wanted.co.kr' || hostname === 'www.wanted.co.kr') && pathname.startsWith('/status/')) {
    return 'wanted';
  }

  return undefined;
}

// 표시 전용 matches와 동일한 호스트다. 이 범위가 수집 가능 페이지를 늘리지는 않는다.
export function detectHistoryPlatform(value: string): 'jobkorea' | 'saramin' | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.port || url.username || url.password) return;
    if (['www.jobkorea.co.kr', 'jobkorea.co.kr'].includes(url.hostname)) return 'jobkorea';
    if (['www.saramin.co.kr', 'saramin.co.kr', 'm.saramin.co.kr'].includes(url.hostname)) return 'saramin';
  } catch { /* 허용된 호스트가 아니면 표시하지 않는다. */ }
}
