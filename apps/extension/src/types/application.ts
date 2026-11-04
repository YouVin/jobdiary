import type { JobPlatform as Platform, ApplicationStatus as Status } from '@jobdiary/shared';
export type { Platform, Status };

export interface ScrapedApplication {
  company: string; // 회사명
  position: string; // 공고명
  platform: Platform; // 플랫폼
  appliedAt: string; // 지원일 (원문)
  deadlineAt?: string; // 지원 공고의 마감 표시 원문. 연도 미확인 값은 어댑터가 생략한다.
  status: string; // 상태 (원문)
  externalId?: string; // 사이트 고유 ID (중복 방지)
  viewed?: boolean; // 열람 여부
  appliedAtExact?: string; // 지원일 (시각 포함 원문)
  url?: string; // 공고 절대 URL
}

// 웹앱과 공유하는 계약. 최종 진실은 웹앱 레포 docs/INTEGRATION.md (docs/INTEGRATION.md 참고).
export interface Application {
  id: string;
  company: string;
  position: string;
  platform: Platform;
  status: Status;
  appliedAt: string; // 자정 기준 ISO
  deadlineAt?: string; // 공고 마감일 (YYYY-MM-DD). 상시채용/미확인은 생략
  updatedAt: string; // ISO
  externalId?: string; // 원티드는 없음
  viewed?: boolean; // 열람 여부
  appliedAtExact?: string; // 지원일 (시각 포함 ISO)
  url?: string; // 공고 절대 URL
}
