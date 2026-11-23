import Link from 'next/link';
import { HeaderActions } from '@/components/header/HeaderActions';
import { HeaderNav } from '@/components/header/HeaderNav';
import { BrandLogo } from '@/components/common/BrandMark';

// 헤더 (#193, #197): 흰 줄 없이 바탕과 이어지고, 취준일기 글자 로고와 알약 메뉴를 쓴다.
export function Header() {
  return (
    <header className="bg-page">
      <div className="mx-auto flex w-full max-w-360 items-center justify-between gap-4 px-4 pb-2 pt-4 md:px-6 md:py-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href="/"
            aria-label="취준일기 홈으로 이동"
            className="flex shrink-0 items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
          >
            <BrandLogo className="h-8 w-auto md:h-9" alt="" />
          </Link>
          <HeaderNav variant="desktop" />
        </div>

        <HeaderActions />
      </div>
      <HeaderNav variant="mobile" />
    </header>
  );
}
