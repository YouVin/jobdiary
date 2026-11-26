import { AuthHeading } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';
import { publicPageMetadata, SITE_DESCRIPTION } from '@/lib/siteMetadata';

export const metadata = publicPageMetadata('로그인', SITE_DESCRIPTION, '/login');

// 로그인(/login) · 틀은 (entry)/layout.tsx의 AuthShell(폼 | 소개). 폼은 components/auth/LoginForm.tsx
export default function LoginPage() {
  return (
    <>
      <AuthHeading title="다시 오셨네요" description="지원 현황을 이어서 관리해 보세요" />
      <LoginForm mode="signin" />
    </>
  );
}
