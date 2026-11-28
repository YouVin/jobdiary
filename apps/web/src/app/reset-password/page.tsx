import type { Metadata } from 'next';
import { AuthHeading, AuthShell } from '@/components/auth/AuthShell';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { PRIVATE_ROBOTS } from '@/lib/siteMetadata';

export const metadata: Metadata = { title: '비밀번호 재설정', robots: PRIVATE_ROBOTS };

// 로그인과 같은 틀(#202). 1024px 미만에서는 소개 첫 화면 없이 폼부터 보여준다.
// 비밀번호 재설정 링크 요청(/reset-password) · 이메일 입력 → 보냈어요 안내
export default function ResetPasswordPage() {
  return (
    <AuthShell mobileIntro={false}>
      <AuthHeading title="비밀번호 재설정" description="가입한 이메일을 입력하면 재설정 링크를 보내요." />
      <ResetPasswordForm />
    </AuthShell>
  );
}
