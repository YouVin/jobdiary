import type { MetadataRoute } from 'next';
import { SEARCH_INDEXABLE, SITE_URL } from '@/lib/siteMetadata';

export default function sitemap(): MetadataRoute.Sitemap {
  return SEARCH_INDEXABLE ? ['/login', '/terms', '/privacy'].map(path => ({ url: `${SITE_URL}${path}` })) : [];
}
