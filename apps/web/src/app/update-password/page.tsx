import type { Metadata } from 'next';
import { AuthHeading, AuthShell } from '@/components/auth/AuthShell';
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm';
import { PRIVATE_ROBOTS } from '@/lib/siteMetadata';

export const metadata: Metadata = { title: '새 비밀번호 설정', robots: PRIVATE_ROBOTS };

// 로그인과 같은 틀(#202). 메일 링크로 바로 들어오므로 1024px 미만에서는 폼부터 보여준다.
// 새 비밀번호 설정(/update-password) · 메일 링크로 들어온다. 링크 확인 → (만료 안내 | 새 비밀번호 입력)
export default function UpdatePasswordPage() {
  return (
    <AuthShell mobileIntro={false}>
      <AuthHeading title="새 비밀번호 설정" description="앞으로 쓸 비밀번호를 입력해 주세요." />
      <UpdatePasswordForm />
    </AuthShell>
  );
}
