import { AuthVisualPanel } from '@/components/auth/AuthVisualPanel';

// 로딩/세션 확인 중에도 서버에서 배치와 서비스 소개를 유지한다.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <main aria-label="로그인 및 회원가입" className="flex min-h-full flex-1 flex-col md:flex-row">
      <h1 className="sr-only">취준일기 로그인 및 회원가입</h1>
      <AuthVisualPanel className="md:order-last" />
      <div className="flex flex-1 items-center justify-center bg-page px-4 py-10 md:w-1/2 md:py-16">
        {children}
      </div>
    </main>
  );
}
