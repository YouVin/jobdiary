import type { Metadata } from 'next';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ImportErrorNotice } from '@/components/dashboard/ApplicationNotices';
import { Header } from '@/components/header/Header';
import { ExtensionImportProvider } from '@/components/import/ExtensionImportProvider';
import { HiringProcessFiller } from '@/components/process/HiringProcessFiller';
import { MAIN_CONTENT_ID } from '@/components/ui/SkipLink';
import { ToastProvider } from '@/components/ui/Toast';
import { PRIVATE_ROBOTS } from '@/lib/siteMetadata';

export const metadata: Metadata = { robots: PRIVATE_ROBOTS };

// 로그인한 화면(홈·지원 보드·계정)의 공통 틀 (#203). 내용 폭 1200, 카드 사이 16.
// 가져오기 상태와 토스트는 헤더와 본문이 함께 쓴다. AuthGuard 안이라 계정이 바뀌면 새로 만들어진다.
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ToastProvider>
        <ExtensionImportProvider>
          {/* 가져온 지원의 공고 전형 절차를 배경에서 채운다(#295) */}
          <HiringProcessFiller />
          <div className="flex min-h-full flex-1 flex-col bg-page">
            {/* ── 머리: 로고·메뉴 | 가져오기·지원 추가·내 계정 ── */}
            <Header />
            {/* ── 본문: 가져오기 오류 알림 → 각 페이지 ── */}
            <main
              id={MAIN_CONTENT_ID}
              tabIndex={-1}
              className="mx-auto flex w-full max-w-300 flex-1 flex-col gap-4 px-4 pt-6 pb-12 focus:outline-none sm:px-6 lg:px-10 lg:pt-8 lg:pb-16"
            >
              <ImportErrorNotice />
              {children}
            </main>
          </div>
        </ExtensionImportProvider>
      </ToastProvider>
    </AuthGuard>
  );
}
