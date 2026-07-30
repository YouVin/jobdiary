import { create } from 'zustand';
import { saveApplications } from '@/lib/storage';
import {
  deleteApplication,
  fetchApplications,
  insertApplication,
  updateApplication as apiUpdateApplication,
} from '@/lib/applicationsApi';
import { Application, Status } from '@/types/application';
import { getImportDecision } from '@/utils/duplicateDetection';

// addApplicationsFromExtension 처리 결과 요약 (UI 안내 문구용, 예: "4건 중 2건 추가, 1건 중복")
export interface ImportSummary {
  addedCount: number; // 중복 없이 정상 추가된 건수
  duplicateCount: number; // 추가는 됐지만 중복 지원으로 감지된 건수
  skippedCount: number; // 같은 건 재수집으로 판단해 스킵한 건수
}

interface ApplicationState {
  applications: Application[];
  isLoading: boolean;
  error: string | null;
  loadApplications: () => Promise<void>;
  addApplication: (app: Omit<Application, 'id' | 'updatedAt'>) => Promise<boolean>;
  addApplicationsFromExtension: (apps: Omit<Application, 'id' | 'updatedAt'>[]) => ImportSummary;
  updateApplication: (id: string, updates: Partial<Omit<Application, 'id' | 'updatedAt'>>) => Promise<boolean>;
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
    const { application, error } = await insertApplication(app);

    if (error || !application) {
      set({ error: error?.message ?? '지원 내역을 추가하지 못했습니다.' });
      return false;
    }

    set({ applications: [...get().applications, application] });
    return true;
  },

  // 익스텐션 수신 연동은 다음 단계(S-4c)에서 Supabase로 전환한다.
  // 지금은 기존 localStorage 기반 로직을 그대로 둔다 — 현재 UI에서 호출하는 곳이 없어 당장은 안전하지만,
  // 실제로 쓰기 시작하면 이 액션만 Supabase에 저장되지 않고 로컬에만 쌓이는 불일치가 생기니 S-4c에서 반드시 같이 전환해야 한다.
  addApplicationsFromExtension: (apps) => {
    const applications = [...get().applications];
    let addedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;

    apps.forEach((app) => {
      const decision = getImportDecision(applications, app);

      if (decision === 'skip') {
        skippedCount += 1;
        return;
      }

      const newApplication: Application = {
        ...app,
        id: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
      };
      // 같은 배치 안에서도 뒤에 오는 건이 방금 추가한 건과 중복인지 판별할 수 있도록 즉시 반영
      applications.push(newApplication);

      if (decision === 'add-duplicate') {
        duplicateCount += 1;
      } else {
        addedCount += 1;
      }
    });

    set({ applications });
    saveApplications(applications);

    return { addedCount, duplicateCount, skippedCount };
  },

  // 수정: 서버 반영에 성공했을 때만 로컬 state 갱신
  updateApplication: async (id, updates) => {
    set({ error: null });
    const { application, error } = await apiUpdateApplication(id, updates);

    if (error || !application) {
      set({ error: error?.message ?? '지원 내역을 수정하지 못했습니다.' });
      return false;
    }

    set({
      applications: get().applications.map((item) => (item.id === id ? application : item)),
    });
    return true;
  },

  // 상태만 변경 (드래그용) — updateApplication과 같은 API를 재사용
  updateStatus: async (id, status) => {
    return get().updateApplication(id, { status });
  },

  // 삭제: 서버 반영에 성공했을 때만 로컬 state에서 제거
  removeApplication: async (id) => {
    set({ error: null });
    const { error } = await deleteApplication(id);

    if (error) {
      set({ error: error.message });
      return false;
    }

    set({ applications: get().applications.filter((item) => item.id !== id) });
    return true;
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
