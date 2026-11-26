import { AccountClient } from '@/components/account/AccountClient';

// 계정 설정(/account) · 로그인 필요. 화면 구성: components/account/AccountClient.tsx
// 제목 → 비밀번호 변경 → 이메일 변경 → 탈퇴
export default function AccountPage() {
  return <AccountClient />;
}
