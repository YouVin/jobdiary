import Link from 'next/link';

// 임시 placeholder — 실제 재설정 요청/발송 로직은 Phase 3에서 구현한다 (docs/AUTH.md §6 Phase 3).
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-page px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          J
        </div>
        <span className="text-lg font-bold text-foreground">취준일기</span>
      </div>

      <div className="w-full max-w-105 rounded-[14px] bg-card p-6 text-center shadow-lg">
        <p className="text-[14px] text-text-primary">비밀번호 재설정 기능은 준비 중입니다.</p>
        <p className="mt-1 text-[12px] text-text-muted">곧 이메일로 재설정 링크를 보내드릴 수 있도록 준비하고 있어요.</p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-lg bg-brand px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-hover"
        >
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
