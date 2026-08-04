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
  updatedCount: number; // 같은 공고의 상태 변화로 판단해 기존 건을 갱신한 건수
  skippedCount: number; // 같은 건 재수집(또는 오래된 갱신 시도)으로 판단해 스킵한 건수
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

  // 익스텐션이 수집한 여러 건을 한 번에 받아 중복 판별 후 Supabase에 일괄 반영한다.
  // (수동 추가와 달리 getImportDecision으로 판별을 거침 — 판별 로직 자체는 그대로 재사용, docs/INTEGRATION.md §5)
  addApplicationsFromExtension: async (apps) => {
    set({ error: null });

    // 판별용으로 점점 늘려가는 후보 목록: 기존 데이터(스토어에 이미 로드된 것) + 이번 배치에서
    // 확정된 추가/갱신 내용 — 같은 배치 안의 항목들끼리도 서로 판별 기준이 되도록 한다.
    // getImportDecision은 id/updatedAt을 읽지 않지만 Application 타입을 요구하므로 신규 추가분은
    // 임시값을 채운다 — 실제 id/updatedAt은 삽입 후 Supabase 응답으로만 반영된다.
    let candidates: Application[] = [...get().applications];
    const toInsert: Omit<Application, 'id' | 'updatedAt'>[] = [];
    const toUpdate: Array<{ id: string; changes: ApplicationChanges }> = [];

    let addedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;

    apps.forEach((app) => {
      const decision = getImportDecision(candidates, app);

      if (decision.type === 'skip') {
        skippedCount += 1;
        return;
      }

      if (decision.type === 'update') {
        // 같은 공고의 상태 변화라도, 들어온 건이 기존 저장분보다 최신(이후)일 때만 반영한다
        // (오래된 상태 정보가 최신 정보를 되돌리지 않도록 — docs/INTEGRATION.md §5).
        const isIncomingNewer = new Date(app.appliedAt).getTime() >= new Date(decision.target.appliedAt).getTime();

        if (!isIncomingNewer) {
          skippedCount += 1;
          return;
        }

        toUpdate.push({ id: decision.target.id, changes: { status: app.status, appliedAt: app.appliedAt } });
        // 같은 배치 안에서 이 공고가 다시 등장할 경우를 대비해 후보 목록도 갱신해둔다.
        candidates = candidates.map((item) =>
          item.id === decision.target.id ? { ...item, status: app.status, appliedAt: app.appliedAt } : item,
        );
        return;
      }

      candidates.push({ ...app, id: crypto.randomUUID(), updatedAt: new Date().toISOString() });
      toInsert.push(app);

      if (decision.type === 'add-duplicate') {
        duplicateCount += 1;
      } else {
        addedCount += 1;
      }
    });

    if (toInsert.length === 0 && toUpdate.length === 0) {
      return { addedCount, duplicateCount, updatedCount: 0, skippedCount, error: null };
    }

    const [insertResult, updateResults] = await Promise.all([
      insertApplications(toInsert),
      Promise.all(toUpdate.map((item) => apiUpdateApplication(item.id, item.changes))),
    ]);

    const successfulUpdates = updateResults
      .map((result) => result.application)
      .filter((application): application is Application => application !== null);
    const failedUpdateCount = toUpdate.length - successfulUpdates.length;

    const errorMessages: string[] = [];
    if (insertResult.error) {
      errorMessages.push(insertResult.error.message || '지원 내역을 저장하지 못했습니다.');
    }
    if (failedUpdateCount > 0) {
      errorMessages.push(`${failedUpdateCount}건 갱신에 실패했습니다.`);
    }
    const combinedError = errorMessages.length > 0 ? errorMessages.join(' ') : null;

    if (combinedError) {
      set({ error: combinedError });
    }

    set((state) => {
      const withUpdates = state.applications.map((item) => {
        const updated = successfulUpdates.find((updatedItem) => updatedItem.id === item.id);
        return updated ?? item;
      });
      const withInserts = insertResult.error ? withUpdates : [...withUpdates, ...insertResult.applications];
      return { applications: withInserts };
    });

    return {
      // 삽입 자체가 실패했으면 실제로는 아무것도 추가되지 않았다 — 0으로 정정.
      addedCount: insertResult.error ? 0 : addedCount,
      duplicateCount: insertResult.error ? 0 : duplicateCount,
      updatedCount: successfulUpdates.length,
      skippedCount,
      error: combinedError,
    };
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
