import { create } from 'zustand';
import { withApplicationLock } from '@/lib/applicationLock';
import type { ApplicationRequestContext } from '@/lib/applicationRequestContext';
import {
  ApplicationChanges,
  deleteApplication,
  fetchApplications,
  insertApplication,
  insertApplications,
  rejectExpiredApplications,
  updateApplication as apiUpdateApplication,
} from '@/lib/applicationsApi';
import { saveApplications } from '@/lib/storage';
import { Application, Status } from '@/types/application';
import { buildExtensionImportPlan } from '@/utils/extensionImportPlan';

// addApplicationsFromExtension 처리 결과 요약 (UI 안내 문구용, 예: "4건 중 2건 추가, 1건 중복")
export interface ImportSummary {
  addedCount: number; // 중복 없이 정상 추가된 건수
  duplicateCount: number; // 추가는 됐지만 중복 지원으로 감지된 건수
  skippedCount: number; // 이미 저장된 지원 또는 배치 내 중복으로 건너뛴 건수
  error: string | null; // 배치 저장 자체가 실패한 경우의 에러 메시지 (성공 시 null)
}

interface ApplicationState {
  userId: string | null;
  sessionVersion: number;
  applications: Application[];
  isLoading: boolean;
  error: string | null;
  loadApplications: () => Promise<void>;
  addApplication: (app: Omit<Application, 'id' | 'updatedAt'>) => Promise<boolean>;
  addApplicationsFromExtension: (apps: Omit<Application, 'id' | 'updatedAt'>[]) => Promise<ImportSummary>;
  updateApplication: (id: string, updates: ApplicationChanges) => Promise<boolean>;
  updateStatus: (id: string, status: Status) => Promise<boolean>;
  removeApplication: (id: string) => Promise<boolean>;
  resetApplications: () => void;
  clearError: () => void;
  setUser: (userId: string | null) => void;
}

const canceledImport: ImportSummary = {
  addedCount: 0, duplicateCount: 0, skippedCount: 0, error: '계정이 변경되어 가져오기를 취소했습니다.',
};

// 잠금을 기다리기 전에 요청 주체를 고정한다. A → 로그아웃 → A도 다른 세대로 취급한다.
function withApplicationSession<T>(operation: (context: ApplicationRequestContext) => Promise<T>, canceled: T): Promise<T> {
  const context = captureApplicationSession();
  return withApplicationLock(async () => {
    if (!context?.isCurrent()) return canceled;
    try {
      return await operation(context);
    } catch (error) {
      if (context.isCurrent()) {
        useApplicationStore.setState({ isLoading: false, error: (error as Error).message ?? '요청을 처리하지 못했습니다.' });
      }
      return canceled;
    }
  });
}

export const useApplicationStore = create<ApplicationState>((set, get) => ({
  userId: null,
  sessionVersion: 0,
  applications: [],
  isLoading: false,
  error: null,

  // Supabase에서 현재 사용자의 지원 내역 전체 조회
  loadApplications: () => withApplicationSession(async (context) => {
    set({ isLoading: true, error: null });
    const deadlineResult = await rejectExpiredApplications(undefined, context);
    if (!context.isCurrent()) return;
    const { applications, error } = await fetchApplications(context);
    if (!context.isCurrent()) return;

    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }

    set({ applications, isLoading: false, error: deadlineResult.error?.message ?? null });
  }, undefined),

  // 추가: 서버 저장에 성공했을 때만 로컬 state에 반영
  addApplication: (app) => withApplicationSession(async (context) => {
    set({ error: null });
    try {
      const { application, error } = await insertApplication(app, context);
      if (!context.isCurrent()) return false;

      if (error || !application) {
        set({ error: error?.message ?? '지원 내역을 추가하지 못했습니다.' });
        return false;
      }

      set({ applications: [...get().applications, application] });
      return true;
    } catch (error) {
      if (!context.isCurrent()) return false;
      set({ error: (error as Error).message ?? '지원 내역을 추가하지 못했습니다.' });
      return false;
    }
  }, false),

  // 익스텐션이 수집한 여러 건을 한 번에 받아 중복 판별 후 Supabase에 일괄 반영한다.
  addApplicationsFromExtension: (apps) => withApplicationSession(async (context) => {
    set({ error: null });

    // 최초 화면 조회가 끝나기 전이거나 다른 탭에서 갱신됐어도 DB의 최신 내역으로 판별한다.
    // 조회 실패를 빈 목록으로 취급하면 모든 건을 다시 추가하므로 반드시 중단한다.
    const { applications, error } = await fetchApplications(context);
    if (!context.isCurrent()) return canceledImport;
    if (error) {
      set({ error: error.message });
      return { addedCount: 0, duplicateCount: 0, skippedCount: 0, error: error.message };
    }
    set({ applications });
    const { toInsert, addedCount, duplicateCount, skippedCount } = buildExtensionImportPlan(applications, apps);

    if (toInsert.length === 0) {
      return { addedCount, duplicateCount, skippedCount, error: null };
    }

    const insertResult = await insertApplications(toInsert, context);
    if (!context.isCurrent()) return canceledImport;
    const combinedError = insertResult.error?.message ?? null;

    if (combinedError) {
      set({ error: combinedError });
    }

    if (!insertResult.error) {
      set((state) => ({ applications: [...state.applications, ...insertResult.applications] }));
    }

    return {
      // 삽입 자체가 실패했으면 실제로는 아무것도 추가되지 않았다 — 0으로 정정.
      addedCount: insertResult.error ? 0 : addedCount,
      duplicateCount: insertResult.error ? 0 : duplicateCount,
      skippedCount,
      error: combinedError,
    };
  }, canceledImport),

  // 수정: 서버 반영에 성공했을 때만 로컬 state 갱신
  updateApplication: (id, updates) => withApplicationSession(async (context) => {
    set({ error: null });
    try {
      const { application, error } = await apiUpdateApplication(id, updates, context);
      if (!context.isCurrent()) return false;

      if (error || !application) {
        set({ error: error?.message ?? '지원 내역을 수정하지 못했습니다.' });
        return false;
      }

      set({
        applications: get().applications.map((item) => (item.id === id ? application : item)),
      });
      return true;
    } catch (error) {
      if (!context.isCurrent()) return false;
      set({ error: (error as Error).message ?? '지원 내역을 수정하지 못했습니다.' });
      return false;
    }
  }, false),

  // 상태만 변경 (드래그용) — updateApplication과 같은 API를 재사용
  updateStatus: async (id, status) => {
    return get().updateApplication(id, { status });
  },

  // 삭제: 서버에서 실제로 삭제됐다고 확인된 경우에만 로컬 state에서 제거
  removeApplication: (id) => withApplicationSession(async (context) => {
    set({ error: null });
    try {
      const { error } = await deleteApplication(id, context);
      if (!context.isCurrent()) return false;

      if (error) {
        set({ error: error.message });
        return false;
      }

      set({ applications: get().applications.filter((item) => item.id !== id) });
      return true;
    } catch (error) {
      if (!context.isCurrent()) return false;
      set({ error: (error as Error).message ?? '지원 내역을 삭제하지 못했습니다.' });
      return false;
    }
  }, false),

  // 로그아웃 시 호출 — 다음 사용자에게 이전 사용자 데이터가 보이지 않도록 로컬 state 초기화
  resetApplications: () => {
    set((state) => ({ userId: null, sessionVersion: state.sessionVersion + 1, applications: [], isLoading: false, error: null }));
    saveApplications([]);
  },

  // 인증 상태를 공개하기 전에 동기 실행한다. 토큰 갱신만 발생하면 데이터를 유지한다.
  setUser: (userId) => {
    if (get().userId === userId) return;
    set((state) => ({ userId, sessionVersion: state.sessionVersion + 1, applications: [], isLoading: false, error: null }));
    saveApplications([]);
  },

  clearError: () => {
    set({ error: null });
  },
}));

export function captureApplicationSession(): ApplicationRequestContext | null {
  const { userId, sessionVersion } = useApplicationStore.getState();
  if (!userId) return null;
  return {
    userId,
    isCurrent: () => {
      const current = useApplicationStore.getState();
      return current.userId === userId && current.sessionVersion === sessionVersion;
    },
  };
}
