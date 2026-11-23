import { clsx } from 'clsx';
import Link from 'next/link';

// 디자인 시스템 탭 (#201). 같은 내용을 다르게 보는 2~4개 보기(주간·보드·중복)를 바꿀 때 쓴다.
// 회색 판(muted, 모서리 12, 안쪽 4) 위에 고른 것만 흰 판(모서리 12 − 4 = 8).
// - 주소가 있는 보기는 링크 + aria-current="page"
// - 같은 주소에서 바꾸는 보기는 버튼 + aria-pressed
// 거르기(여러 개를 켜고 끄기)에는 FilterChip을 쓴다.
export interface TabItem {
  value: string;
  label: string;
  count?: number;
  countTone?: 'default' | 'danger'; // 중복처럼 주의가 필요한 개수
  href?: string;
}

interface TabsProps {
  label: string; // 묶음의 접근성 이름 (예: 보기 선택)
  items: TabItem[];
  value: string;
  onChange?: (value: string) => void;
  className?: string;
}

const ITEM_CLASS =
  'inline-flex h-9 cursor-pointer items-center gap-2 rounded-sm px-4 text-label font-semibold transition-colors duration-fast focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

export function Tabs({ label, items, value, onChange, className }: TabsProps) {
  const isLinks = items.every((item) => item.href);
  const Wrapper = isLinks ? 'nav' : 'div';

  return (
    <Wrapper
      aria-label={label}
      role={isLinks ? undefined : 'group'}
      className={clsx('inline-flex gap-1 rounded-md bg-muted p-1', className)}
    >
      {items.map((item) => {
        const isSelected = item.value === value;
        const itemClass = clsx(ITEM_CLASS, isSelected ? 'bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary');
        const content = (
          <>
            {item.label}
            {item.count !== undefined && (
              <span className={clsx('tabular-nums', item.countTone === 'danger' ? 'text-danger-text' : 'text-text-secondary')}>{item.count}</span>
            )}
          </>
        );
        if (item.href) {
          return (
            <Link key={item.value} href={item.href} aria-current={isSelected ? 'page' : undefined} className={itemClass}>
              {content}
            </Link>
          );
        }
        return (
          <button key={item.value} type="button" aria-pressed={isSelected} onClick={() => onChange?.(item.value)} className={itemClass}>
            {content}
          </button>
        );
      })}
    </Wrapper>
  );
}
