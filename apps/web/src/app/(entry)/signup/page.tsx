import { AuthHeading } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';
import { publicPageMetadata, SITE_DESCRIPTION } from '@/lib/siteMetadata';

export const metadata = publicPageMetadata('회원가입', SITE_DESCRIPTION, '/signup');

// 회원가입(/signup) · 로그인과 같은 틀·같은 폼(mode="signup")
export default function SignupPage() {
  return (
    <>
      <AuthHeading title="환영해요" description="지원한 곳을 한곳에 모아 기록해요" />
      <LoginForm mode="signup" />
    </>
  );
}
