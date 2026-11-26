'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';
import { useEffect } from 'react';
import { rememberAcquisition } from '@/lib/acquisitionApi';
import { analyticsUrl } from '@/utils/analyticsUrl';

// Vercel Web Analytics(쿠키 없음): 페이지 조회 수와 유입 경로만 본다(#256).
// 쿼리·해시를 뺀 경로만 보낸다(utils/analyticsUrl.ts). 운영(Vercel)에서만 수집되고, 대시보드에서 켜야 한다.
function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = analyticsUrl(event.url);
  return url ? { ...event, url } : null;
}

// 가입 경로(#290): Vercel Hobby는 utm을 보여 주지 않아, 처음 들어온 출처를 브라우저에 기억했다가 가입 직후 직접 센다.
// 루트 레이아웃에 한 번 붙어 첫 페이지 주소만 본다(이후 화면 이동은 같은 방문).
export function SiteAnalytics() {
  useEffect(() => {
    rememberAcquisition(window.location.href, document.referrer);
  }, []);

  return <Analytics beforeSend={beforeSend} />;
}
