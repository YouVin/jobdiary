'use client';

import { useState } from 'react';
import { PolicyLinks } from '@/components/auth/PolicyLinks';
import { buttonClassName } from '@/components/common/buttonStyles';
import { supabase } from '@/lib/supabase';
import { consentMetadata } from '@/lib/legal';
import { captureApplicationSession } from '@/store/applicationStore';
import { useAuthStore } from '@/store/authStore';

export function ConsentGate() {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    if (!agreed || busy) return;
    const context = captureApplicationSession();
    if (!context) return;
    setBusy(true);
    setError(null);
    try {
      const { data: verified, error: verifyError } = await supabase.auth.getUser();
      if (!context.isCurrent()) return;
      if (verifyError || verified.user?.id !== context.userId) throw new Error('계정을 다시 확인해주세요.');
      const { data, error: saveError } = await supabase.auth.updateUser({ data: consentMetadata() });
      if (!context.isCurrent()) return;
      if (saveError || !data.user || data.user.id !== context.userId) throw new Error('동의를 저장하지 못했습니다. 다시 시도해주세요.');
      const session = useAuthStore.getState().session;
      if (session?.user.id === context.userId) useAuthStore.getState().setSession({ ...session, user: data.user });
    } catch (cause) {
      if (context.isCurrent()) setError(cause instanceof Error ? cause.message : '동의를 저장하지 못했습니다.');
    } finally {
      if (context.isCurrent()) setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-105 flex-1 flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-heading-lg text-text-primary">서비스 이용 안내</h1>
      <p className="text-body text-text-secondary">지원 내역을 기록하기 전에 약관과 개인정보 처리 내용을 확인해주세요. 동의하지 않으면 서비스 이용을 중단할 수 있습니다.</p>
      <div className="flex items-start gap-2">
        <input id="policy-consent" type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-1 h-4 w-4 accent-brand" />
        <label htmlFor="policy-consent" className="text-label text-text-secondary"><PolicyLinks />을 확인하고 이용약관에 동의합니다.</label>
      </div>
      <button type="button" disabled={!agreed || busy} onClick={accept} className={buttonClassName()}>{busy ? '저장 중...' : '동의하고 시작하기'}</button>
      <button type="button" disabled={busy} onClick={async () => {
        setError(null);
        try {
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) setError('로그아웃하지 못했습니다. 다시 시도해주세요.');
        } catch { setError('로그아웃하지 못했습니다. 다시 시도해주세요.'); }
      }} className={buttonClassName('secondary')}>로그아웃</button>
      <p className="text-label text-text-muted">계정 삭제 및 개인정보 문의: dbqls1210@gmail.com</p>
      {error && <p role="alert" className="text-label text-status-rejected">{error}</p>}
    </main>
  );
}
