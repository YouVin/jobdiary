// 가입 경로 (#290): 처음 들어온 주소에서 "어디서 왔는지"만 뽑는다. 저장·전송은 lib/acquisitionApi.ts.
// 서버 함수(record_acquisition)도 같은 규칙으로 한 번 더 정리한다.

export interface Acquisition {
  source: string | null; // utm_source (예: threads)
  medium: string | null; // utm_medium (예: social)
  campaign: string | null; // utm_campaign (예: launch_2026_11)
  referrer: string | null; // 이전 사이트 도메인 (소개 페이지로 들어왔을 때만)
  landing: string; // 처음 본 페이지 경로 (쿼리 없음)
  seenAt: string; // 처음 본 시각 (ISO)
}

export const ACQUISITION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30일 지나 가입하면 그 링크 덕으로 보지 않는다

// 이전 사이트 주소는 소개 페이지에서만 본다. 로그인·가입 화면은 Google 로그인·메일 확인 링크에서 돌아오는 곳이라
// accounts.google.com·mail.naver.com 같은 주소가 가입 경로로 잘못 남는다. utm은 어느 페이지든 본다.
const REFERRER_LANDINGS = ['/intro'];

function clean(value: string | null, pattern: RegExp, max: number): string | null {
  if (!value) return null;
  const cleaned = value.toLowerCase().replace(pattern, '').slice(0, max);
  return cleaned || null;
}

export function readAcquisition(href: string, referrer: string, now = new Date()): Acquisition | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const param = (name: string) => clean(url.searchParams.get(name), /[^a-z0-9._-]/g, 60);
  const source = param('utm_source');

  let referrerHost: string | null = null;
  if (referrer && REFERRER_LANDINGS.includes(url.pathname)) {
    try {
      const from = new URL(referrer);
      if (from.host !== url.host) referrerHost = clean(from.hostname, /[^a-z0-9.-]/g, 100);
    } catch {
      referrerHost = null;
    }
  }

  if (!source && !referrerHost) return null; // 바로 들어온 방문은 남기지 않는다
  return { source, medium: param('utm_medium'), campaign: param('utm_campaign'), referrer: referrerHost, landing: url.pathname.slice(0, 100), seenAt: now.toISOString() };
}

export function isFreshAcquisition(acquisition: Acquisition, now = new Date()): boolean {
  const seenAt = Date.parse(acquisition.seenAt);
  return !Number.isNaN(seenAt) && now.valueOf() - seenAt <= ACQUISITION_MAX_AGE_MS;
}
