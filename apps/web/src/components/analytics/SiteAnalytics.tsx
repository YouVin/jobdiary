'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';
import { analyticsUrl } from '@/utils/analyticsUrl';

// Vercel Web Analytics(쿠키 없음): 페이지 조회 수와 유입 경로만 본다(#256).
// 쿼리·해시를 뺀 경로만 보낸다(utils/analyticsUrl.ts). 운영(Vercel)에서만 수집되고, 대시보드에서 켜야 한다.
function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = analyticsUrl(event.url);
  return url ? { ...event, url } : null;
}

export function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
