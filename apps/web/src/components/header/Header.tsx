import Link from 'next/link';
import { HeaderActions } from '@/components/header/HeaderActions';
import { HeaderNav } from '@/components/header/HeaderNav';
import { BrandLogo } from '@/components/common/BrandMark';

// 헤더 (#203, 캔버스 메인 시안). 흰 바탕 + 아래 구분선, 높이 64, 내용 폭 1200.
// 데스크톱(768 이상): 로고 · 메뉴 · 오른쪽 버튼이 한 줄. 모바일: 로고와 버튼이 위, 메뉴가 아래 줄 전체 폭.
export function Header() {
  return (
    <header className="border-b border-line-divider bg-surface">
      <div className="mx-auto flex min-h-16 w-full max-w-300 flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6 md:py-0 lg:px-10">
        <Link
          href="/"
          aria-label="취준일기 홈으로 이동"
          className="flex shrink-0 items-center rounded-sm focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
        >
          <BrandLogo className="h-7 w-auto" alt="" />
        </Link>
        <HeaderNav className="order-last w-full md:order-none md:w-auto md:flex-1" />
        <HeaderActions className="ml-auto md:ml-0" />
      </div>
    </header>
  );
}
