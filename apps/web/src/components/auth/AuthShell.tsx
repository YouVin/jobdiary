import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { AuthIntro } from '@/components/auth/AuthIntro';
import { BrandLogo } from '@/components/common/BrandMark';
import { MAIN_CONTENT_ID } from '@/components/ui/SkipLink';

interface AuthShellProps {
  children: ReactNode;
  // 1024px 미만에서 소개(아이폰) 첫 화면을 보여줄지. 로그인·가입은 보여주고,
  // 메일 링크로 바로 들어오는 비밀번호 재설정 화면은 폼이 먼저 보이게 숨긴다.
  mobileIntro?: boolean;
}

// 로그인·회원가입·비밀번호 재설정이 함께 쓰는 틀 (#202).
// 폼(<main>)을 소개(<aside>)보다 먼저 두어 읽는 순서와 Tab 순서는 항상 폼이 먼저다.
// 1024px 미만에서 소개가 위에 보이는 건 화면 배치(order)만 바꾼 것이고, 소개 안에는 누를 것이 없다.
export function AuthShell({ children, mobileIntro = true }: AuthShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface lg:flex-row">
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="flex justify-center px-5 pt-8 pb-12 focus:outline-none lg:flex-1 lg:basis-0 lg:items-center lg:py-16"
      >
        <div className="flex w-full max-w-100 flex-col gap-8">
          <BrandLogo className={clsx('-mb-3 h-7 w-auto self-start', mobileIntro && 'max-lg:hidden')} />
          {children}
        </div>
      </main>
      <AuthIntro className={clsx('order-first lg:order-none', !mobileIntro && 'max-lg:hidden')} />
    </div>
  );
}

interface AuthHeadingProps {
  title: string;
  description: string;
}

// 화면 제목(h1)과 한 줄 설명. 서버에서 바로 그려 세션 확인 중에도 제목이 있다.
export function AuthHeading({ title, description }: AuthHeadingProps) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-title-1-sm text-text-primary sm:text-title-1">{title}</h1>
      <p className="text-body text-text-secondary">{description}</p>
    </div>
  );
}
