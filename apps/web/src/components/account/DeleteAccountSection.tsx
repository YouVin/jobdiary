'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { deleteAccount, signOut } from '@/lib/auth';
import { captureApplicationSession, useApplicationStore } from '@/store/applicationStore';
import { useAuthStore } from '@/store/authStore';

const CONFIRM_PHRASE = '탈퇴합니다';

// 회원 탈퇴 — Edge Function(delete-account)을 호출해 서버에서 계정을 삭제한다 (docs/AUTH.md §6.5.4).
// applications는 DB의 ON DELETE CASCADE로 함께 삭제되므로 웹앱에서 별도로 지우지 않는다.
// 되돌릴 수 없는 일이라 빨강 제목 + 확인 문구 입력을 둔다. 문구가 다르면 버튼을 눌러도 이유를 칸 아래에 알려준다(#205).
export function DeleteAccountSection() {
  const router = useRouter();
  const resetApplications = useApplicationStore((state) => state.resetApplications);

  const [confirmText, setConfirmText] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const confirmError = confirmText === CONFIRM_PHRASE ? null : `"${CONFIRM_PHRASE}"를 그대로 입력해 주세요.`;

  const handleDelete = async () => {
    if (isSubmitting) return;
    setIsChecked(true);
    if (confirmError) {
      document.getElementById('deleteConfirm')?.focus();
      return;
    }

    const context = captureApplicationSession();
    if (!context) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    const { error } = await deleteAccount();
    if (!context.isCurrent()) return;

    if (error) {
      console.error('[delete-account] 실패:', error);
      setErrorMessage('탈퇴하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
      setIsSubmitting(false);
      return;
    }

    // 성공 시엔 isSubmitting을 되돌리지 않는다 — 곧 /login으로 리다이렉트되므로, 버튼을 다시
    // 활성화하면 이미 삭제된 계정으로 중복 요청을 보낼 틈이 생긴다.
    // 서버에서는 이미 계정이 삭제됐다. signOut()의 서버 측 결과(이미 없는 계정이라 에러가 날 수
    // 있다)와 무관하게 로컬 세션·데이터는 능동적으로 정리한다 (docs/AUTH.md §6.5.4 "완료 후 처리",
    // §6.5.7 엣지케이스 2 — 잔여 토큰이 남지 않도록).
    resetApplications();
    try {
      await signOut();
    } catch (signOutError) {
      console.error('[delete-account] 탈퇴 후 signOut 실패(무시하고 진행):', signOutError);
    }
    const currentUserId = useAuthStore.getState().session?.user.id;
    if (currentUserId && currentUserId !== context.userId) return;
    router.replace('/login?accountDeleted=1');
  };

  return (
    <Card aria-labelledby="delete-account-title">
      <div className="flex flex-col gap-1">
        <h2 id="delete-account-title" className="text-title-3 text-danger-text">
          회원 탈퇴
        </h2>
        <p className="text-label text-text-secondary">탈퇴하면 계정과 모든 지원 기록이 지워지고 되돌릴 수 없어요.</p>
      </div>
      <TextField
        id="deleteConfirm"
        label={`계속하려면 "${CONFIRM_PHRASE}"를 입력하세요`}
        value={confirmText}
        onChange={(event) => setConfirmText(event.target.value)}
        aria-required="true"
        autoComplete="off"
        readOnly={isSubmitting}
        error={isChecked ? confirmError : null}
      />
      <p role="alert" className={errorMessage ? 'text-label text-danger-text' : 'sr-only'}>
        {errorMessage}
      </p>
      <Button variant="danger" onClick={handleDelete} isLoading={isSubmitting} loadingLabel="탈퇴하는 중" className="self-start">
        회원 탈퇴
      </Button>
    </Card>
  );
}
