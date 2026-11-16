import { Status } from '@/types/application';

export const STATUS_INFO: Record<Status, { label: string }> = {
  applied: { label: '지원완료' },
  screening: { label: '서류통과' },
  interview: { label: '면접예정' },
  interviewed: { label: '면접완료' },
  offer: { label: '합격' },
  rejected: { label: '탈락' },
  canceled: { label: '지원취소' },
};

// 상태별 점 색상 토큰 (칸반 컬럼 머리·홈 최근 지원 공통).
// Tailwind가 클래스명을 정적으로 인식하도록 리터럴로 작성한다.
export const STATUS_DOT_CLASS: Record<Status, string> = {
  applied: 'bg-status-applied',
  screening: 'bg-status-screening',
  interview: 'bg-status-interview',
  interviewed: 'bg-status-interview',
  offer: 'bg-status-offer',
  rejected: 'bg-status-rejected',
  canceled: 'bg-status-canceled',
};

// 칸반 컬럼 순서
export const STATUS_ORDER: Status[] = [
  'applied',
  'screening',
  'interview',
  'interviewed',
  'offer',
  'rejected',
  'canceled',
];
