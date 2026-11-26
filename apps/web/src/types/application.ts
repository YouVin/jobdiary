import type { JobPlatform, ApplicationStatus } from '@jobdiary/shared';
export type Platform = JobPlatform | 'manual';
export type Status = ApplicationStatus;

export interface DiaryEntry {
  id: string;
  content: string; // 일기 내용
  mood?: string; // 감정 (선택)
  createdAt: string;
  status?: Status; // 기록을 남길 때의 단계 (#175부터 쓴 기록에만 있다)
}

// 단계 변경 한 번 (#283). DB 트리거가 채우며 화면은 읽기만 한다.
export interface StatusChange {
  from: Status | null; // 처음 저장할 때는 null
  to: Status;
  source?: 'extension' | 'created' | 'manual' | 'deadline';
  at: string; // 바뀐 시각 (ISO)
}

export interface Application {
  id: string;
  company: string; // 회사명
  position: string; // 공고명
  platform: Platform; // 어느 사이트
  status: Status; // 현재 상태
  statusSource?: 'extension' | 'created' | 'manual' | 'deadline'; // 수동 이동과 자동 분류를 구분
  appliedAt: string; // 지원일 (ISO)
  deadlineAt?: string; // 공고 마감일 (YYYY-MM-DD). 없으면 상시/미확인
  updatedAt: string;
  memo?: string;
  diary?: DiaryEntry[]; // 일기 목록
  interviewDate?: string;
  url?: string;
  externalId?: string; // 각 사이트의 지원건 고유 ID (중복 판별용, 원티드는 없어서 optional)
  statusHistory?: StatusChange[]; // 단계 변경 이력, 오래된 것부터 (#283). 2026-11-26 전 지원은 그 뒤 변경부터 있다
}
