'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApplicationStore } from '@/store/applicationStore';

const NAV_ITEMS = [
  { href: '/', label: '대시보드', showCount: false },
  { href: '/board', label: '지원보드', showCount: true },
] as const;

interface HeaderNavProps {
  variant: 'desktop' | 'mobile';
}

// 데스크톱은 로고 옆 알약 메뉴, 모바일은 헤더 아래 전체 폭 알약 메뉴(#193). 계정 설정 등 다른 경로에서는 선택 표시가 없다.
export function HeaderNav({ variant }: HeaderNavProps) {
  const pathname = usePathname();
  // 처음 불러오기 전에는 0건으로 보이지 않도록 건수를 숨긴다.
  const count = useApplicationStore((state) => (state.historyReady ? state.applications.length : null));
  const isMobile = variant === 'mobile';

  return (
    <nav
      aria-label="주요 메뉴"
      className={clsx(
        'gap-1 rounded-full border border-card-border bg-card p-1 shadow-card',
        isMobile ? 'mx-4 mb-2 flex md:hidden' : 'hidden md:flex',
      )}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={clsx(
              'flex items-center justify-center gap-2 rounded-full py-2 text-legacy-body font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              isMobile ? 'flex-1' : 'px-4',
              isActive ? 'bg-brand text-on-brand' : 'text-text-secondary hover:bg-column hover:text-text-primary',
            )}
          >
            {item.label}
            {item.showCount && count !== null && (
              <span className={clsx('text-legacy-label font-normal tabular-nums', isActive ? 'text-on-brand/70' : 'text-text-muted')}>{count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
