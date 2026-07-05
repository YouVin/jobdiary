import { create } from 'zustand';
import { getApplications, saveApplications } from '@/lib/storage';
import { Application, Status } from '@/types/application';

interface ApplicationState {
  applications: Application[];
  loadApplications: () => void;
  addApplication: (app: Omit<Application, 'id' | 'updatedAt'>) => void;
  updateApplication: (id: string, updates: Partial<Application>) => void;
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

  // 수정 후 저장 (updatedAt 갱신)
  updateApplication: (id, updates) => {
    const applications = get().applications.map((application) => {
      if (application.id !== id) {
        return application;
      }
      return { ...application, ...updates, updatedAt: new Date().toISOString() };
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
