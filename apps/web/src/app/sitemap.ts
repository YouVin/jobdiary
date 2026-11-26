import type { MetadataRoute } from 'next';
import { SEARCH_INDEXABLE, SITE_URL } from '@/lib/siteMetadata';

export default function sitemap(): MetadataRoute.Sitemap {
  return SEARCH_INDEXABLE ? ['/intro', '/login', '/signup', '/terms', '/privacy'].map(path => ({ url: `${SITE_URL}${path}` })) : [];
}
