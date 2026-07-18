import { create } from 'zustand';
import { getApplications, saveApplications } from '@/lib/storage';
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
  loadApplications: () => void;
  addApplication: (app: Omit<Application, 'id' | 'updatedAt'>) => void;
  addApplicationsFromExtension: (apps: Omit<Application, 'id' | 'updatedAt'>[]) => ImportSummary;
  updateApplication: (id: string, updates: Partial<Omit<Application, 'id'>>) => void;
  updateStatus: (id: string, status: Status) => void;
  removeApplication: (id: string) => void;
}

export const useApplicationStore = create<ApplicationState>((set, get) => ({
  applications: [],

  // localStorage에서 불러와 state에 세팅 (초기 로드용)
  loadApplications: () => {
    set({ applications: getApplications() });
  },

  // 추가 후 저장
  addApplication: (app) => {
    const newApplication: Application = {
      ...app,
      id: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    };
    const applications = [...get().applications, newApplication];
    set({ applications });
    saveApplications(applications);
  },

  // 익스텐션이 수집한 여러 건을 한 번에 받아 중복 판별 후 저장 (수동 추가와 달리 중복 판별을 거침)
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

  // 수정 후 저장 (updatedAt 갱신)
  updateApplication: (id, updates) => {
    const applications = get().applications.map((application) => {
      if (application.id !== id) {
        return application;
      }
      return { ...application, ...updates, id: application.id, updatedAt: new Date().toISOString() };
    });
    set({ applications });
    saveApplications(applications);
  },

  // 상태만 변경 후 저장 (드래그용, updatedAt 갱신)
  updateStatus: (id, status) => {
    const applications = get().applications.map((application) => {
      if (application.id !== id) {
        return application;
      }
      return { ...application, status, updatedAt: new Date().toISOString() };
    });
    set({ applications });
    saveApplications(applications);
  },

  // 삭제 후 저장
  removeApplication: (id) => {
    const applications = get().applications.filter((application) => application.id !== id);
    set({ applications });
    saveApplications(applications);
  },
}));
