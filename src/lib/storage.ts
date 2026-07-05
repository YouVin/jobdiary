import { Application } from '@/types/application';

const STORAGE_KEY = 'jobdiary:applications';

// 저장된 지원 목록 조회 (서버/파싱 실패 시 빈 배열)
export function getApplications(): Application[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as Application[];
  } catch {
    return [];
  }
}

// 지원 목록 저장
export function saveApplications(apps: Application[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch (error) {
    console.warn('failed to save applications to localStorage', error);
  }
}
