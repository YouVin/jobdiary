'use client';

import { useEffect, useRef, useState } from 'react';
import { PolicyLinks } from '@/components/auth/PolicyLinks';
import { BrandLogo } from '@/components/common/BrandMark';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { MAIN_CONTENT_ID } from '@/components/ui/SkipLink';
import { saveConsent, signOut } from '@/lib/auth';
import { captureApplicationSession } from '@/store/applicationStore';
import { useAuthStore } from '@/store/authStore';

const SAVE_FAILED = '동의를 저장하지 못했어요. 다시 시도해 주세요.';
const ACCOUNT_CHANGED = '계정을 다시 확인해 주세요.';

// 약관 동의 화면 (#205 새 디자인). Google 첫 로그인처럼 지금 약관 버전에 동의한 기록이 없을 때 AuthGuard가 보여준다.
// 회색 바탕 위 흰 카드 하나: 로고 → 제목(포커스) → 설명 → 동의 체크 → 시작 버튼(주요) → 로그아웃(보조) → 문의.
export function ConsentGate() {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  // 로그인 폼이 사라진 뒤 새 단계의 시작을 알린다. 일반 상태 안내에는 포커스하지 않는다.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const accept = async () => {
    if (!agreed || busy) return;
    const context = captureApplicationSession();
    if (!context) return;
    setBusy(true);
    setError(null);
    try {
      // 1) 계정을 다시 확인하고 동의 버전 저장 (lib/auth.ts)
      const { user, error: saveError } = await saveConsent(context.userId, context.isCurrent);
      if (!context.isCurrent() || saveError === 'stale') return;
      if (saveError === 'account_changed') throw new Error(ACCOUNT_CHANGED);
      if (saveError || !user) throw new Error(SAVE_FAILED);
      // 2) 화면의 세션에도 동의 정보를 반영해 AuthGuard가 바로 다음 화면을 보여 주게 한다
      const session = useAuthStore.getState().session;
      if (session?.user.id === context.userId) useAuthStore.getState().setSession({ ...session, user });
    } catch (cause) {
      if (context.isCurrent()) setError(cause instanceof Error ? cause.message : SAVE_FAILED);
    } finally {
      if (context.isCurrent()) setBusy(false);
    }
  };

  const logout = async () => {
    setError(null);
    try {
      const { error: signOutError } = await signOut();
      if (signOutError) setError('로그아웃하지 못했어요. 다시 시도해 주세요.');
    } catch {
      setError('로그아웃하지 못했어요. 다시 시도해 주세요.');
    }
  };

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-page px-4 py-10">
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        aria-labelledby="consent-title"
        className="flex w-full max-w-110 flex-col gap-6 rounded-xl bg-surface p-6 focus:outline-none sm:p-8"
      >
        <BrandLogo className="h-7 w-auto self-start" />
        <div className="flex flex-col gap-2">
          <h1
            id="consent-title"
            ref={heading}
            tabIndex={-1}
            className="rounded-xs text-title-1-sm text-text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:text-title-1"
          >
            서비스 이용 안내
          </h1>
          <p id="consent-hint" className="text-body text-text-secondary">
            지원 기록을 시작하기 전에 약관과 개인정보 처리 내용을 확인해 주세요. 동의하지 않으면 로그아웃할 수 있어요.
          </p>
        </div>
        <Checkbox id="policy-consent" checked={agreed} disabled={busy} aria-required="true" aria-describedby="consent-hint" onChange={(event) => setAgreed(event.target.checked)}>
          [필수] <PolicyLinks />을 확인했고, 이용약관에 동의해요.
        </Checkbox>
        <div className="flex flex-col gap-2">
          <Button size="lg" block disabled={!agreed} isLoading={busy} loadingLabel="저장하는 중" onClick={accept}>
            동의하고 시작하기
          </Button>
          <Button variant="secondary" size="lg" block disabled={busy} onClick={logout}>
            로그아웃
          </Button>
        </div>
        <p role="status" aria-atomic="true" className="sr-only">
          {busy ? '약관 동의를 저장하고 있어요.' : ''}
        </p>
        <p role="alert" aria-atomic="true" className={error ? 'text-label text-danger-text' : 'sr-only'}>
          {error}
        </p>
        <p className="text-label text-text-secondary">계정 삭제 및 개인정보 문의: dbqls1210@gmail.com</p>
      </main>
    </div>
  );
}
