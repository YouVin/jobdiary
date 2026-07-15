export type Platform = 'saramin' | 'wanted' | 'jobkorea' | 'manual';

export type Status =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'interviewed'
  | 'offer'
  | 'rejected'
  | 'canceled';

export interface DiaryEntry {
  id: string;
  content: string; // 일기 내용
  mood?: string; // 감정 (선택)
  createdAt: string;
}

export interface Application {
  id: string;
  company: string; // 회사명
  position: string; // 공고명
  platform: Platform; // 어느 사이트
  status: Status; // 현재 상태
  appliedAt: string; // 지원일 (ISO)
  updatedAt: string;
  memo?: string;
  diary?: DiaryEntry[]; // 일기 목록
  interviewDate?: string;
  url?: string;
}
