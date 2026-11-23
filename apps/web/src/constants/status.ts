import { Status } from '@/types/application';

// 단계 이름은 토스처럼 띄어 쓴다 (#199 결정, #204). 화면 표시용이며 저장값·익스텐션 연동은 키(applied 등)만 쓴다.
export const STATUS_INFO: Record<Status, { label: string }> = {
  applied: { label: '지원 완료' },
  screening: { label: '서류 통과' },
  interview: { label: '면접 예정' },
  interviewed: { label: '면접 완료' },
  offer: { label: '합격' },
  rejected: { label: '탈락' },
  canceled: { label: '지원 취소' },
};

// 단계 점 색은 디자인 시스템 STAGE_DOT_CLASS(components/ui/Badge.tsx)를 쓴다 (#204에서 예전 STATUS_DOT_CLASS를 지움).

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
