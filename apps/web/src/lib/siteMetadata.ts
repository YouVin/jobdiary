import type { Metadata } from 'next';

// 도메인이 바뀌면 canonical·공유 주소·sitemap을 함께 바꿀 수 있는 단일 기준이다.
export const SITE_URL = 'https://jobdiary.vercel.app';
export const SITE_NAME = '취준일기';
export const SITE_DESCRIPTION = '사람인·잡코리아·원티드 지원 내역을 한곳에서 관리하세요. 칸반 보드, 마감일 정리, 면접 일정과 취업 준비 기록을 제공합니다.';
export const SEARCH_INDEXABLE = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production';
export const PRIVATE_ROBOTS: Metadata['robots'] = { index: false, follow: false };

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  const url = new URL(path, SITE_URL).toString();
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: SEARCH_INDEXABLE, follow: SEARCH_INDEXABLE },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url, siteName: SITE_NAME, locale: 'ko_KR', type: 'website' },
    twitter: { card: 'summary', title: `${title} | ${SITE_NAME}`, description },
  };
}
