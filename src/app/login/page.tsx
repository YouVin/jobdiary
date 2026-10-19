import { LoginForm } from '@/components/auth/LoginForm';
import { publicPageMetadata, SITE_DESCRIPTION } from '@/lib/siteMetadata';

export const metadata = publicPageMetadata('로그인 및 회원가입', SITE_DESCRIPTION, '/login');

export default function LoginPage() {
  return <LoginForm />;
}
