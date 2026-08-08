'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteAccount, signOut } from '@/lib/auth';
import { useApplicationStore } from '@/store/applicationStore';

const CONFIRM_PHRASE = '탈퇴합니다';

// 회원 탈퇴 — Edge Function(delete-account)을 호출해 서버에서 계정을 삭제한다 (docs/AUTH.md §6.5.4).
// applications는 DB의 ON DELETE CASCADE로 함께 삭제되므로 웹앱에서 별도로 지우지 않는다.
export function DeleteAccountSection() {
  const router = useRouter();
  const resetApplications = useApplicationStore((state) => state.resetApplications);

  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = confirmText === CONFIRM_PHRASE;

  const handleDelete = async () => {
    if (!canSubmit) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const { error } = await deleteAccount();

      if (error) {
        console.error('[delete-account] 실패:', error);
        setErrorMessage('탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      // 서버에서는 이미 계정이 삭제됐다. signOut()의 서버 측 결과(이미 없는 계정이라 에러가 날 수
      // 있다)와 무관하게 로컬 세션·데이터는 능동적으로 정리한다 (docs/AUTH.md §6.5.4 "완료 후 처리",
      // §6.5.7 엣지케이스 2 — 잔여 토큰이 남지 않도록).
      resetApplications();
      try {
        await signOut();
      } catch (signOutError) {
        console.error('[delete-account] 탈퇴 후 signOut 실패(무시하고 진행):', signOutError);
      }
      router.replace('/login?accountDeleted=1');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-[14px] border border-status-rejected/30 bg-status-rejected/5 p-5">
      <h2 className="text-[15px] font-semibold text-status-rejected">회원 탈퇴</h2>
      <p className="mt-2 text-[13px] text-text-secondary">
        탈퇴하면 계정과 모든 지원 내역이 영구적으로 삭제되며, 이 작업은 되돌릴 수 없습니다.
      </p>

      <div className="mt-4">
        <label htmlFor="deleteConfirm" className="mb-1 block text-[12px] font-medium text-text-secondary">
          계속하려면 <span className="font-semibold text-status-rejected">{CONFIRM_PHRASE}</span>를 입력하세요
        </label>
        <input
          id="deleteConfirm"
          type="text"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          className="w-full rounded-lg border border-border-strong px-3 py-2 text-[14px] text-text-primary focus:border-status-rejected focus:outline-none"
          aria-required="true"
        />
      </div>

      {errorMessage && (
        <p role="alert" className="mt-2 text-[12px] text-status-rejected">
          {errorMessage}
        </p>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={!canSubmit || isSubmitting}
        className="mt-4 rounded-lg bg-status-rejected px-4 py-2 text-[14px] font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? '탈퇴 처리 중...' : '회원 탈퇴'}
      </button>
    </section>
  );
}
