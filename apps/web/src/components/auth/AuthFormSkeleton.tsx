interface AuthFormSkeletonProps {
  isSignUp?: boolean;
}

// 세션 확인과 라우트 로딩에서 재사용한다. 실제 입력/버튼을 만들어 탭 이동을 가로채지 않는다.
// 모양은 새 폼(#202)과 같은 높이로 맞춰 폼이 나타날 때 화면이 덜 흔들리게 한다: 입력칸·버튼 52px.
export function AuthFormSkeleton({ isSignUp = false }: AuthFormSkeletonProps) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="w-full">
      <span className="sr-only">{isSignUp ? '회원가입' : '로그인'} 화면을 준비하고 있어요.</span>
      <div aria-hidden="true" className="flex flex-col gap-4 animate-pulse motion-reduce:animate-none">
        {Array.from({ length: isSignUp ? 3 : 2 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="h-5 w-16 rounded-xs bg-muted" />
            <div className="h-13 rounded-md bg-subtle" />
          </div>
        ))}
        {isSignUp && <div className="h-5 w-full rounded-xs bg-muted" />}
        <div className="mt-1 h-13 rounded-md bg-muted" />
        <div className="h-5 rounded-xs bg-subtle" />
        <div className="h-13 rounded-md bg-subtle" />
      </div>
    </div>
  );
}
