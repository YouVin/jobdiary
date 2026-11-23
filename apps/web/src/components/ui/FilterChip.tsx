import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// 디자인 시스템 필터 칩 (#201). 목록을 거르는 칩(지원 경로, 단계). 켜짐은 aria-pressed로 알린다.
// 고른 칩은 검정(inverse). 파랑은 버튼·강조 숫자에 쓰고 있어 거르기는 검정으로 구분한다.
interface FilterChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  isSelected: boolean;
  count?: number;
}

export function FilterChip({ isSelected, count, type = 'button', className, children, ...rest }: FilterChipProps) {
  return (
    <button
      type={type}
      aria-pressed={isSelected}
      className={clsx(
        'inline-flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-full px-4 text-label font-semibold transition-colors duration-fast focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        isSelected ? 'bg-inverse text-text-on-color' : 'bg-subtle text-text-secondary hover:bg-muted hover:text-text-primary',
        className,
      )}
      {...rest}
    >
      {children}
      {count !== undefined && <span className="tabular-nums">{count}</span>}
    </button>
  );
}

interface ChipGroupProps {
  label: string; // 묶음의 접근성 이름 (예: 지원 경로)
  children: ReactNode;
  className?: string;
}

export function ChipGroup({ label, children, className }: ChipGroupProps) {
  return (
    <div role="group" aria-label={label} className={clsx('flex flex-wrap gap-2', className)}>
      {children}
    </div>
  );
}
