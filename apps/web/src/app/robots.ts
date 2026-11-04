import type { MetadataRoute } from 'next';
import { SEARCH_INDEXABLE, SITE_URL } from '@/lib/siteMetadata';

export default function robots(): MetadataRoute.Robots {
  // noindex를 읽을 수 있도록 운영 크롤링은 허용한다. 접근 권한은 인증/RLS에서 처리한다.
  return SEARCH_INDEXABLE
    ? { rules: { userAgent: '*', allow: '/' }, sitemap: `${SITE_URL}/sitemap.xml` }
    : { rules: { userAgent: '*', disallow: '/' } };
}
