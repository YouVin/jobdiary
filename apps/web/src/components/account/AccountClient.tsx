import { ChangeEmailSection } from '@/components/account/ChangeEmailSection';
import { ChangePasswordSection } from '@/components/account/ChangePasswordSection';
import { DeleteAccountSection } from '@/components/account/DeleteAccountSection';

// 계정 설정 (#205): 제목 h1 + 한 줄 설명 → 비밀번호 변경 → 이메일 변경 → 회원 탈퇴(빨강). 읽기 쉬운 폭 600.
export function AccountClient() {
  return (
    <div className="mx-auto flex w-full max-w-150 flex-col gap-4">
      <div className="flex flex-col gap-1 px-1 pb-2">
        <h1 className="text-title-1-sm text-text-primary sm:text-title-1">계정 설정</h1>
        <p className="text-body text-text-secondary">로그인 정보와 계정을 관리해요</p>
      </div>
      <ChangePasswordSection />
      <ChangeEmailSection />
      <DeleteAccountSection />
    </div>
  );
}
