import { Application } from '@/types/application';
import type { Acquisition } from '@/utils/acquisition';

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

const ACTIVITY_DATE_KEY_PREFIX = 'jobdiary:activityDate:';

// 계정별로 이 브라우저에서 방문 날짜를 마지막으로 기록한 한국 날짜(YYYY-MM-DD, #256).
// 같은 날 다시 요청하지 않기 위한 편의 값이다. 저장할 수 없는 환경에서는 null(매번 기록 요청, 서버가 하루 한 줄로 합친다).
export function loadActivityDate(userId: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(ACTIVITY_DATE_KEY_PREFIX + userId);
  } catch {
    return null;
  }
}

export function saveActivityDate(userId: string, date: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(ACTIVITY_DATE_KEY_PREFIX + userId, date);
  } catch {
    // 저장하지 못해도 기록은 이미 서버에 있다
  }
}

const ACQUISITION_KEY = 'jobdiary:acquisition';

// 가입 경로(#290): 로그인 전 처음 들어온 출처. 계정이 생기기 전이라 브라우저 하나에 하나만 둔다.
// 가입 직후 서버에 보내고 지운다. 저장할 수 없는 환경에서는 기록하지 않는다(가입에는 영향 없음).
export function loadAcquisition(): Acquisition | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const value = localStorage.getItem(ACQUISITION_KEY);
    const parsed = value ? (JSON.parse(value) as Acquisition) : null;
    return parsed && typeof parsed.seenAt === 'string' && typeof parsed.landing === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function saveAcquisition(acquisition: Acquisition): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(ACQUISITION_KEY, JSON.stringify(acquisition));
  } catch {
    // 기억하지 못하면 가입 경로를 세지 않을 뿐이다
  }
}

export function clearAcquisition(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(ACQUISITION_KEY);
  } catch {
    // 지우지 못해도 서버가 계정당 한 번만 받는다
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
export type BoardView = 'week' | 'kanban' | 'duplicates';
const BOARD_VIEWS: BoardView[] = ['week', 'kanban', 'duplicates'];

// 지원보드에서 마지막으로 고른 보기(주간/보드/중복 #186). 이 브라우저에만 남는 편의 정보라 계정과 상관없이 하나만 둔다.
export function loadBoardView(): BoardView {
  if (typeof window === 'undefined') {
    return 'week';
  }

  try {
    const saved = localStorage.getItem(BOARD_VIEW_KEY);
    return BOARD_VIEWS.find((view) => view === saved) ?? 'week';
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
