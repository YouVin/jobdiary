import Link from 'next/link';
import { BrandLogo } from '@/components/common/BrandMark';
import { MAIN_CONTENT_ID } from '@/components/ui/SkipLink';
import { textLinkClassName } from '@/components/ui/TextLink';

// 이용약관·개인정보처리방침 공통 틀 (#205). 회색 바탕 위 흰 카드에 긴 글을 읽기 좋은 폭(768)으로 둔다.
// 위 줄은 로고(홈) + 두 문서 사이 이동 링크.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-page">
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 focus:outline-none sm:py-10">
        <nav aria-label="정책 문서" className="flex flex-wrap items-center justify-between gap-4 px-1">
          <Link href="/" aria-label="취준일기 홈" className="rounded-sm focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus-ring">
            <BrandLogo className="h-7 w-auto" alt="" />
          </Link>
          <span className="flex gap-4 text-label">
            <Link href="/terms" className={textLinkClassName('quiet')}>
              이용약관
            </Link>
            <Link href="/privacy" className={textLinkClassName('quiet')}>
              개인정보처리방침
            </Link>
          </span>
        </nav>
        <article className="flex flex-col gap-6 rounded-xl bg-surface p-5 text-body text-text-secondary sm:p-8">{children}</article>
      </main>
    </div>
  );
}
