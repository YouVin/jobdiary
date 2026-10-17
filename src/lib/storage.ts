import { Application } from '@/types/application';

const STORAGE_KEY = 'jobdiary:applications';

// 계정 초기화 시 이전 localStorage 지원 목록을 빈 배열로 덮어쓴다.
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
