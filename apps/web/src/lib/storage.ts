import { Application } from '@/types/application';

const STORAGE_KEY = 'jobdiary:applications';

const LAST_IMPORT_KEY_PREFIX = 'jobdiary:lastImportAt:';

// 계정별 마지막 익스텐션 가져오기 시각(ISO). 사용자 ID를 키에 넣어 다른 계정에는 보이지 않는다.
// 이 브라우저에만 남는 편의 정보이며, 저장할 수 없는 환경에서는 null로 동작한다.
export function loadLastImportAt(userId: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const value = localStorage.getItem(LAST_IMPORT_KEY_PREFIX + userId);
    return value && !Number.isNaN(Date.parse(value)) ? value : null;
  } catch {
    return null;
  }
}

export function saveLastImportAt(userId: string, importedAt: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(LAST_IMPORT_KEY_PREFIX + userId, importedAt);
  } catch (error) {
    console.warn('failed to save last import time to localStorage', error);
  }
}

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

const BOARD_VIEW_KEY = 'jobdiary:boardView';
export type BoardView = 'week' | 'kanban';

// 지원보드에서 마지막으로 고른 보기(주간/보드). 이 브라우저에만 남는 편의 정보라 계정과 상관없이 하나만 둔다.
export function loadBoardView(): BoardView {
  if (typeof window === 'undefined') {
    return 'week';
  }

  try {
    return localStorage.getItem(BOARD_VIEW_KEY) === 'kanban' ? 'kanban' : 'week';
  } catch {
    return 'week';
  }
}

export function saveBoardView(view: BoardView): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(BOARD_VIEW_KEY, view);
  } catch (error) {
    console.warn('failed to save board view to localStorage', error);
  }
}
