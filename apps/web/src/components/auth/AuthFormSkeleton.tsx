interface AuthFormSkeletonProps {
  isSignUp?: boolean;
}

// 세션 확인과 라우트 로딩에서 재사용한다. 실제 입력/버튼을 만들어 탭 이동을 가로채지 않는다.
export function AuthFormSkeleton({ isSignUp = false }: AuthFormSkeletonProps) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="w-full max-w-105">
      <span className="sr-only">{isSignUp ? '회원가입' : '로그인'} 화면을 준비하고 있습니다.</span>
      <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
        <div className="mb-6 hidden h-8 w-28 rounded-lg bg-column md:block" />
        <div className="mb-6 space-y-2">
          <div className="h-8 w-40 rounded-lg bg-column" />
          <div className="h-4 w-56 max-w-full rounded-lg bg-column" />
        </div>
        <div className="mb-5 h-12 rounded-lg bg-column" />
        <div className="space-y-3">
          {Array.from({ length: isSignUp ? 3 : 2 }, (_, index) => (
            <div key={index} className="space-y-1">
              <div className="h-4 w-16 rounded bg-column" />
              <div className="h-10 rounded-lg border border-card-border bg-column" />
            </div>
          ))}
          <div className={isSignUp ? 'h-8 w-full rounded bg-column' : 'ml-auto h-4 w-40 rounded bg-column'} />
          <div className="h-10 rounded-lg bg-column" />
        </div>
        <div className="my-4 h-4 rounded bg-column" />
        <div className="h-10 rounded-lg border border-card-border bg-column" />
        <div className="mt-3 h-8 rounded bg-column" />
      </div>
    </div>
  );
}
