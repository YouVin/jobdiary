import type { Application, Platform } from '@/types/application';

export interface ApplicationFilters {
  query: string;
  platform: Platform | 'all';
  hideClosed: boolean;
}

export const DEFAULT_APPLICATION_FILTERS: ApplicationFilters = {
  query: '',
  platform: 'all',
  hideClosed: false,
};

function normalize(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function filterApplications(applications: Application[], filters: ApplicationFilters): Application[] {
  const query = normalize(filters.query);
  return applications.filter((application) => {
    if (filters.platform !== 'all' && application.platform !== filters.platform) return false;
    if (filters.hideClosed && ['offer', 'rejected', 'canceled'].includes(application.status)) return false;
    return !query || normalize(application.company).includes(query) || normalize(application.position).includes(query);
  });
}
