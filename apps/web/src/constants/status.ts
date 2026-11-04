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
