import type { Application, DiaryEntry, Status } from '@/types/application';
import { companyKey } from '@/utils/duplicateDetection';

// 면접 후기 (#276). 별도 칸을 만들지 않고 기록(diary)에 틀을 넣어 쓴다.
// 면접 완료 때 쓴 기록이거나 틀로 시작한 기록을 후기로 본다.

export const INTERVIEW_REVIEW_TEMPLATE = '받은 질문\n- \n\n내 답\n- \n\n아쉬운 점\n- ';
// 틀을 넣은 뒤 커서를 둘 자리(첫 "- " 뒤)
export const INTERVIEW_REVIEW_CURSOR = INTERVIEW_REVIEW_TEMPLATE.indexOf('- ') + 2;

// 틀 버튼을 보여 줄 단계: 면접을 앞두거나 막 본 때
export const INTERVIEW_REVIEW_STATUSES: Status[] = ['interview', 'interviewed'];

export function isInterviewReview(entry: DiaryEntry): boolean {
  return entry.status === 'interviewed' || entry.content.trimStart().startsWith('받은 질문');
}

export interface PastInterviewReview {
  applicationId: string;
  position: string;
  entry: DiaryEntry;
}

// 같은 회사(법인 표기·띄어쓰기 무시)의 다른 지원에 남긴 면접 후기. 최근 것이 위.
export function getPastInterviewReviews(applications: Application[], current: Application): PastInterviewReview[] {
  const key = companyKey(current.company);
  const reviews: PastInterviewReview[] = [];
  for (const application of applications) {
    if (application.id === current.id || companyKey(application.company) !== key) continue;
    for (const entry of application.diary ?? []) {
      if (isInterviewReview(entry)) reviews.push({ applicationId: application.id, position: application.position, entry });
    }
  }
  return reviews.sort((a, b) => b.entry.createdAt.localeCompare(a.entry.createdAt));
}
