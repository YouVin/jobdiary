'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApplicationStore } from '@/store/applicationStore';

// 띄어쓰기는 토스처럼 "지원 보드" (#199 결정).
const NAV_ITEMS = [
  { href: '/', label: '홈', showCount: false },
  { href: '/board', label: '지원 보드', showCount: true },
] as const;

// 주 메뉴 (#203). 지금 화면은 aria-current="page" + 옅은 회색 판·굵은 글자. 계정 설정 등 다른 경로에서는 선택 표시가 없다.
// 모바일에서는 헤더 아래 줄에 두 칸을 나눠 채운다.
export function HeaderNav({ className }: { className?: string }) {
  const pathname = usePathname();
  // 처음 불러오기 전에는 0건으로 보이지 않도록 건수를 숨긴다.
  const count = useApplicationStore((state) => (state.historyReady ? state.applications.length : null));

  return (
    <nav aria-label="주 메뉴" className={clsx('flex gap-1', className)}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={clsx(
              'flex h-10 flex-1 items-center justify-center gap-2 rounded-sm px-3 text-body transition-colors duration-fast md:flex-none',
              'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
              isActive ? 'bg-subtle font-bold text-text-primary' : 'font-semibold text-text-secondary hover:bg-subtle hover:text-text-primary',
            )}
          >
            {item.label}
            {item.showCount && count !== null && <span className="text-label font-normal text-text-secondary tabular-nums">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
