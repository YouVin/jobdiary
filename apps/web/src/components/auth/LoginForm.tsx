'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AuthFormSkeleton } from '@/components/auth/AuthFormSkeleton';
import { EmailAuthFields } from '@/components/auth/EmailAuthFields';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { PolicyLinks } from '@/components/auth/PolicyLinks';
import { ResendConfirmationButton } from '@/components/auth/ResendConfirmationButton';
import { Button } from '@/components/ui/Button';
import { textLinkClassName } from '@/components/ui/TextLink';
import { type AuthMode, useEmailAuthForm } from '@/hooks/useEmailAuthForm';
import { useOneTimeQueryMessage } from '@/hooks/useOneTimeQueryMessage';
import { useAuthStore } from '@/store/authStore';
import { getBoardRedirectPath } from '@/utils/authRedirect';

export type { AuthMode };

const noopSubscribe = () => () => {};

// 익스텐션이 붙인 ?import=1은 로그인 ↔ 가입 화면을 오가도 유지한다 (docs/AUTH.md 허용 목록과 같은 값만).
function getImportQuery(): string {
  return new URL(window.location.href).searchParams.get('import') === '1' ? '?import=1' : '';
}

interface LoginFormProps {
  mode: AuthMode;
}

// /login(로그인)과 /signup(회원가입)이 함께 쓰는 폼 (#202). 예전에는 한 화면의 탭으로 오갔고,
// 지금은 아래 "가입하기 / 로그인하기" 링크로 주소를 바꾼다. 화면이 바뀌면 입력·오류 상태도 새로 시작한다.
// 입력·검사·제출은 useEmailAuthForm, 입력 칸은 EmailAuthFields (#264).
export function LoginForm({ mode }: LoginFormProps) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  // ── 폼 상태·처리 함수 ──
  const form = useEmailAuthForm(mode);
  const { isSignUp, isSubmitting, isOAuthPending, isBusy, authError } = form;

  // ── 이동: 로그인되면 보드로(쿼리 보존) ──
  const importQuery = useSyncExternalStore(noopSubscribe, getImportQuery, () => '');
  const redirectToBoard = useCallback(() => {
    router.replace(getBoardRedirectPath(window.location.href));
  }, [router]);
  // 이미 로그인된 상태로 /login에 들어오거나, 방금 로그인/회원가입에 성공하면 보드로 이동
  useEffect(() => {
    if (status === 'authenticated') {
      redirectToBoard();
    }
  }, [status, redirectToBoard]);

  // ── 한 번만 보이는 안내: 비밀번호 변경·탈퇴 뒤 돌아온 경우 ──
  const oneTimeMessage = useOneTimeQueryMessage({
    passwordUpdated: '비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요.',
    accountDeleted: '탈퇴가 끝났어요. 그동안 이용해 주셔서 고마워요.',
  });

  // ── 세션 확인 중이거나 이미 로그인됨(이동 중): 폼 대신 자리만 ──
  if (status !== 'unauthenticated') {
    return <AuthFormSkeleton isSignUp={isSignUp} />;
  }

  const notice = form.infoMessage ?? oneTimeMessage;

  return (
    <div className="flex flex-col gap-8">
      {/* ── 처리 중 안내(스크린리더) ── */}
      {/* 처리 중 안내는 폼 밖에 미리 둔 알림 영역으로 읽는다. 버튼 글자 변화에만 기대지 않는다. */}
      <p role="status" aria-atomic="true" className="sr-only">
        {isSubmitting ? (isSignUp ? '이메일로 가입하고 있어요.' : '이메일로 로그인하고 있어요.') : isOAuthPending ? 'Google 로그인 화면으로 이동하고 있어요.' : ''}
      </p>

      <div className="flex flex-col gap-4">
        {/* ── 이메일 폼: 입력 칸 → 제출 버튼 ── */}
        <form
          id="email-auth-form"
          aria-label={isSignUp ? '이메일 회원가입' : '이메일 로그인'}
          aria-busy={isSubmitting}
          onSubmit={form.handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <EmailAuthFields fields={form.fields} disabled={isBusy} />
          <Button
            type="submit"
            size="lg"
            block
            disabled={isOAuthPending}
            isLoading={isSubmitting}
            loadingLabel={isSignUp ? '가입하는 중' : '로그인하는 중'}
            className="mt-1"
          >
            {isSignUp ? '가입하기' : '로그인'}
          </Button>
        </form>

        {/* ── 오류·안내(이메일·구글 공통) ── */}
        {/* 처음부터 있는 알림 영역에 글자만 바꿔 넣어 스크린리더가 놓치지 않게 한다 */}
        <p role="alert" aria-atomic="true" className={authError ? 'text-label text-danger-text' : 'sr-only'}>
          {authError?.message}
        </p>
        {authError?.kind === 'email-not-confirmed' && <ResendConfirmationButton email={form.fields.email} />}
        <p role="status" aria-atomic="true" className={notice ? 'text-label text-success-text' : 'sr-only'}>
          {notice}
        </p>

        {/* ── 또는 → 구글 로그인 ── */}
        <div aria-hidden="true" className="flex items-center gap-3 text-label text-text-secondary">
          <span className="h-px flex-1 bg-line-divider" />
          또는
          <span className="h-px flex-1 bg-line-divider" />
        </div>
        <GoogleSignInButton
          disabled={isBusy}
          describedBy="google-auth-hint"
          onPendingChange={form.handleOAuthPendingChange}
          onStart={form.startGoogle}
          onError={form.handleGoogleError}
        />
      </div>

      {/* ── 아래: 로그인 ↔ 가입 이동·구글 안내 ── */}
      <div className="flex flex-col gap-3">
        <p className="text-body text-text-secondary">
          {isSignUp ? '이미 회원인가요? ' : '아직 회원이 아닌가요? '}
          <Link href={`${isSignUp ? '/login' : '/signup'}${importQuery}`} className={textLinkClassName('brand')}>
            {isSignUp ? '로그인하기' : '가입하기'}
          </Link>
        </p>
        <p id="google-auth-hint" className="text-label text-text-secondary">
          Google에서는 이메일과 프로필만 받아요. 약관 동의가 필요하면 로그인한 뒤 한 번만 물어봐요.{' '}
          <PolicyLinks joiner=" · " />
        </p>
      </div>
    </div>
  );
}
