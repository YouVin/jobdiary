import type { Metadata } from 'next';

// 도메인이 바뀌면 canonical·공유 주소·sitemap을 함께 바꿀 수 있는 단일 기준이다.
export const SITE_URL = 'https://jobdiary.vercel.app';
export const SITE_NAME = '취준일기';
export const SITE_DESCRIPTION = '사람인, 잡코리아, 원티드 지원 내역을 한곳에서 관리하세요. 칸반 보드, 마감일 정리, 면접 일정과 취업 준비 기록을 제공합니다.';
export const SEARCH_INDEXABLE = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production';
export const PRIVATE_ROBOTS: Metadata['robots'] = { index: false, follow: false };

// 링크 미리보기 카드 (#288). 이미지는 app/opengraph-image.tsx가 빌드 때 만든다.
// 페이지가 openGraph를 따로 주면 위(루트)의 이미지를 덮어써서, 공개 페이지에는 여기서 직접 붙인다.
export const OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: '취준일기: 사람인, 잡코리아, 원티드 지원 내역을 한곳에 모아 지원부터 합격까지 지나온 단계를 보여 주는 취업 준비 기록장',
};

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  const url = new URL(path, SITE_URL).toString();
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: SEARCH_INDEXABLE, follow: SEARCH_INDEXABLE },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url, siteName: SITE_NAME, locale: 'ko_KR', type: 'website', images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title: `${title} | ${SITE_NAME}`, description, images: [OG_IMAGE] },
  };
}
