import { AuthShell } from '@/components/auth/AuthShell';

// 로그인·회원가입이 함께 쓰는 틀 (#202). 둘 사이를 오가도 소개 영역은 다시 그리지 않는다.
export default function EntryLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
