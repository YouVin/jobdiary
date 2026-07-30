import { create } from 'zustand';
import { saveApplications } from '@/lib/storage';
import {
  ApplicationChanges,
  deleteApplication,
  fetchApplications,
  insertApplication,
  insertApplications,
  updateApplication as apiUpdateApplication,
} from '@/lib/applicationsApi';
import { Application, Status } from '@/types/application';
import { getImportDecision } from '@/utils/duplicateDetection';

// addApplicationsFromExtension 처리 결과 요약 (UI 안내 문구용, 예: "4건 중 2건 추가, 1건 중복")
export interface ImportSummary {
  addedCount: number; // 중복 없이 정상 추가된 건수
  duplicateCount: number; // 추가는 됐지만 중복 지원으로 감지된 건수
  skippedCount: number; // 같은 건 재수집으로 판단해 스킵한 건수
  error: string | null; // 배치 저장 자체가 실패한 경우의 에러 메시지 (성공 시 null)
}

interface ApplicationState {
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
}

export const useApplicationStore = create<ApplicationState>((set, get) => ({
  applications: [],
  isLoading: false,
  error: null,

  // Supabase에서 현재 사용자의 지원 내역 전체 조회
  loadApplications: async () => {
    set({ isLoading: true, error: null });
    const { applications, error } = await fetchApplications();

    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }

    set({ applications, isLoading: false });
  },

  // 추가: 서버 저장에 성공했을 때만 로컬 state에 반영
  addApplication: async (app) => {
    set({ error: null });
    try {
      const { application, error } = await insertApplication(app);

      if (error || !application) {
        set({ error: error?.message ?? '지원 내역을 추가하지 못했습니다.' });
        return false;
      }

      set({ applications: [...get().applications, application] });
      return true;
    } catch (error) {
      set({ error: (error as Error).message ?? '지원 내역을 추가하지 못했습니다.' });
      return false;
    }
  },

  // 익스텐션이 수집한 여러 건을 한 번에 받아 중복 판별 후 Supabase에 일괄 저장한다.
  // (수동 추가와 달리 getImportDecision으로 판별을 거침 — 판별 로직 자체는 그대로 재사용)
  addApplicationsFromExtension: async (apps) => {
    set({ error: null });

    // 판별용으로 점점 늘려가는 후보 목록: 기존 데이터(스토어에 이미 로드된 것) + 이번 배치에서
    // 저장 대상으로 확정된 것들. getImportDecision은 id/updatedAt을 읽지 않지만 Application 타입을
    // 요구하므로 임시값을 채운다 — 실제 id/updatedAt은 삽입 후 Supabase 응답으로만 반영된다.
    const candidates: Application[] = [...get().applications];
    const toInsert: Omit<Application, 'id' | 'updatedAt'>[] = [];

    let addedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;

    apps.forEach((app) => {
      const decision = getImportDecision(candidates, app);

      if (decision === 'skip') {
        skippedCount += 1;
        return;
      }

      candidates.push({ ...app, id: crypto.randomUUID(), updatedAt: new Date().toISOString() });
      toInsert.push(app);

      if (decision === 'add-duplicate') {
        duplicateCount += 1;
      } else {
        addedCount += 1;
      }
    });

    if (toInsert.length === 0) {
      return { addedCount, duplicateCount, skippedCount, error: null };
    }

    const { applications: inserted, error } = await insertApplications(toInsert);

    if (error) {
      const message = error.message || '지원 내역을 저장하지 못했습니다.';
      set({ error: message });
      // 삽입 자체가 실패했으니 실제로는 아무것도 저장되지 않았다 — skippedCount만 그대로 두고 나머지는 0으로 정정.
      return { addedCount: 0, duplicateCount: 0, skippedCount, error: message };
    }

    set({ applications: [...get().applications, ...inserted] });
    return { addedCount, duplicateCount, skippedCount, error: null };
  },

  // 수정: 서버 반영에 성공했을 때만 로컬 state 갱신
  updateApplication: async (id, updates) => {
    set({ error: null });
    try {
      const { application, error } = await apiUpdateApplication(id, updates);

      if (error || !application) {
        set({ error: error?.message ?? '지원 내역을 수정하지 못했습니다.' });
        return false;
      }

      set({
        applications: get().applications.map((item) => (item.id === id ? application : item)),
      });
      return true;
    } catch (error) {
      set({ error: (error as Error).message ?? '지원 내역을 수정하지 못했습니다.' });
      return false;
    }
  },

  // 상태만 변경 (드래그용) — updateApplication과 같은 API를 재사용
  updateStatus: async (id, status) => {
    return get().updateApplication(id, { status });
  },

  // 삭제: 서버에서 실제로 삭제됐다고 확인된 경우에만 로컬 state에서 제거
  removeApplication: async (id) => {
    set({ error: null });
    try {
      const { error } = await deleteApplication(id);

      if (error) {
        set({ error: error.message });
        return false;
      }

      set({ applications: get().applications.filter((item) => item.id !== id) });
      return true;
    } catch (error) {
      set({ error: (error as Error).message ?? '지원 내역을 삭제하지 못했습니다.' });
      return false;
    }
  },

  // 로그아웃 시 호출 — 다음 사용자에게 이전 사용자 데이터가 보이지 않도록 로컬 state 초기화
  resetApplications: () => {
    set({ applications: [], error: null });
    saveApplications([]);
  },

  clearError: () => {
    set({ error: null });
  },
}));
