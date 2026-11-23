import { clsx } from 'clsx';
import type { ReactNode } from 'react';

// 디자인 시스템 통계 칸 (#201). 이름(13) 위, 숫자(24/700) 아래, 단위는 숫자 뒤에 작게.
// 여러 칸을 dl로 묶어 스크린리더가 "이름: 값"으로 읽는다. 칸 사이 세로 구분선은 640 이상에서만(모바일 두 줄 배치에서 줄 첫 칸이 들여 써지지 않게).
interface StatGroupProps {
  label?: string;
  children: ReactNode;
  className?: string;
}

export function StatGroup({ label, children, className }: StatGroupProps) {
  return (
    <dl aria-label={label} className={clsx('grid grid-cols-2 gap-y-4 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]', className)}>
      {children}
    </dl>
  );
}

interface StatCellProps {
  label: string;
  value: number | string;
  unit?: string; // 건 · 곳 · 번 · %
}

// 0은 보조 글자색(text-secondary 5.95:1)으로 낮춘다. 디자인 시스템 처음 값 text-disabled(2.89:1)는 큰 글자 기준 3:1에도 못 미쳐 바꿨다(#201). 문장에서는 "아직 없어요"라고 쓴다.
export function StatCell({ label, value, unit }: StatCellProps) {
  const isZero = value === 0 || value === '0';
  return (
    <div className="flex flex-col gap-1 border-line-divider pr-4 sm:px-4 sm:first:pl-0 sm:[&:not(:first-child)]:border-l">
      <dt className="text-label text-text-secondary">{label}</dt>
      <dd className={clsx('text-title-1 tabular-nums', isZero ? 'text-text-secondary' : 'text-text-primary')}>
        {value}
        {unit && <span className={clsx('ml-1 text-body font-normal', 'text-text-secondary')}>{unit}</span>}
      </dd>
    </div>
  );
}
