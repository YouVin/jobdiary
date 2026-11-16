import Link from 'next/link';
import { HeaderActions } from '@/components/header/HeaderActions';
import { HeaderNav } from '@/components/header/HeaderNav';

export function Header() {
  return (
    <header className="border-b border-card-border bg-card">
      <div className="mx-auto flex w-full max-w-360 items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-8">
          <Link
            href="/"
            aria-label="취준일기 홈으로 이동"
            className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-body font-bold text-on-brand">
              J
            </div>
            <span className="text-heading-md font-bold text-text-primary">취준일기</span>
          </Link>
          <HeaderNav variant="desktop" />
        </div>

        <HeaderActions />
      </div>
      <HeaderNav variant="mobile" />
    </header>
  );
}
