import Link from 'next/link';
import { HeaderActions } from '@/components/header/HeaderActions';

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-card-border bg-card px-6 py-4">
      <Link
        href="/"
        aria-label="취준일기 홈으로 이동"
        className="flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-body font-bold text-on-brand">
          J
        </div>
        <span className="text-heading-md font-bold text-text-primary">취준일기</span>
      </Link>

      <HeaderActions />
    </header>
  );
}
