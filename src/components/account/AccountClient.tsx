import { ChangeEmailSection } from '@/components/account/ChangeEmailSection';
import { ChangePasswordSection } from '@/components/account/ChangePasswordSection';
import { DeleteAccountSection } from '@/components/account/DeleteAccountSection';

export function AccountClient() {
  return (
    <div className="mx-auto flex w-full max-w-105 flex-col gap-4">
      <h1 className="text-[20px] font-bold text-text-primary">계정 설정</h1>
      <ChangePasswordSection />
      <ChangeEmailSection />
      <DeleteAccountSection />
    </div>
  );
}
