'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApplicationStore } from '@/store/applicationStore';

const NAV_ITEMS = [
  { href: '/', label: '대시보드', showCount: false },
  { href: '/board', label: '지원 보드', showCount: true },
] as const;

interface HeaderNavProps {
  variant: 'desktop' | 'mobile';
}

// 데스크톱은 로고 옆 탭, 모바일은 헤더 아래 전체 폭 탭 줄. 계정 설정 등 다른 경로에서는 선택 표시가 없다.
export function HeaderNav({ variant }: HeaderNavProps) {
  const pathname = usePathname();
  // 처음 불러오기 전에는 0건으로 보이지 않도록 건수를 숨긴다.
  const count = useApplicationStore((state) => (state.historyReady ? state.applications.length : null));
  const isMobile = variant === 'mobile';

  return (
    <nav
      aria-label="주요 메뉴"
      className={isMobile ? 'flex border-t border-card-border md:hidden' : 'hidden gap-1 md:flex'}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={clsx(
              'flex items-center justify-center gap-2 text-body font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
              isMobile
                ? 'flex-1 border-b-2 py-3'
                : 'rounded-lg px-3 py-2',
              isMobile && (isActive ? 'border-brand text-brand-text' : 'border-transparent text-text-secondary'),
              !isMobile && (isActive ? 'bg-brand-tint text-brand-text' : 'text-text-secondary hover:bg-column hover:text-text-primary'),
            )}
          >
            {item.label}
            {item.showCount && count !== null && (
              <span className="text-label font-normal text-text-muted tabular-nums">{count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
