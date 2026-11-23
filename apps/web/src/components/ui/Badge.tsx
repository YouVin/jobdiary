import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { STATUS_INFO } from '@/constants/status';
import type { Status } from '@/types/application';

// 디자인 시스템 뱃지 (#201). 한 줄 끝에 붙는 짧은 상태 표시. 누를 수 없고, 한 줄에 하나(많아도 둘)만 둔다.
// 높이 24, 모서리 8, 글자 12/600, 연한 바탕 + 진한 글자(모두 4.5:1 이상).
export type BadgeTone = 'default' | 'today' | 'info' | 'success' | 'danger';

const TONE: Record<BadgeTone, string> = {
  default: 'bg-subtle text-text-secondary', // 남은 날 (D-5)
  today: 'bg-today-tint text-today-text', // 오늘·D-day에만
  info: 'bg-selected text-text-brand-strong', // 서류 통과 같은 진행 소식
  success: 'bg-success-tint text-success-text', // 합격
  danger: 'bg-danger-tint text-danger-text', // 중복 지원, 오래 소식 없음
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'default', children, className }: BadgeProps) {
  return (
    <span className={clsx('inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-sm px-2 text-caption tabular-nums', TONE[tone], className)}>
      {children}
    </span>
  );
}

// 단계 점 색. 면접 예정·면접 완료는 같은 색이다. Tailwind가 읽도록 리터럴로 둔다.
export const STAGE_DOT_CLASS: Record<Status, string> = {
  applied: 'bg-stage-applied',
  screening: 'bg-stage-screening',
  interview: 'bg-stage-interview',
  interviewed: 'bg-stage-interview',
  offer: 'bg-stage-offer',
  rejected: 'bg-stage-rejected',
  canceled: 'bg-stage-canceled',
};

interface StageDotProps {
  status: Status;
  label?: string; // 기본은 단계 이름. 개수를 붙일 때 바꾼다 (예: 서류 통과 4)
  className?: string;
}

// 단계 표시는 뱃지가 아니라 점 8 + 글자 13. 색만으로 구분하지 않도록 글자를 항상 함께 둔다.
export function StageDot({ status, label, className }: StageDotProps) {
  return (
    <span className={clsx('inline-flex items-center gap-2 text-label', className)}>
      <span aria-hidden="true" className={clsx('h-2 w-2 shrink-0 rounded-full', STAGE_DOT_CLASS[status])} />
      {label ?? STATUS_INFO[status].label}
    </span>
  );
}
