import { Status } from '@/types/application';

export const STATUS_INFO: Record<Status, { label: string; color: string }> = {
  applied: { label: '지원완료', color: '#A1A1AA' },
  screening: { label: '서류통과', color: '#378ADD' },
  interview: { label: '면접예정', color: '#7F77DD' },
  interviewed: { label: '면접완료', color: '#7F77DD' },
  offer: { label: '합격', color: '#639922' },
  rejected: { label: '탈락', color: '#E24B4A' },
};

// 칸반 컬럼 순서
export const STATUS_ORDER: Status[] = [
  'applied',
  'screening',
  'interview',
  'interviewed',
  'offer',
  'rejected',
];
