interface PasswordToggleButtonProps {
  isVisible: boolean;
  onToggle: () => void;
  fieldLabel: string;
}

// 비밀번호류 입력 안에 겹쳐 그리는 표시·숨김 토글 버튼. 로그인/회원가입/새 비밀번호 폼에서 재사용한다.
export function PasswordToggleButton({ isVisible, onToggle, fieldLabel }: PasswordToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isVisible ? `${fieldLabel} 숨기기` : `${fieldLabel} 표시`}
      aria-pressed={isVisible}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-secondary"
    >
      {isVisible ? (
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 8 11 8a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4 8 11 8a9.74 9.74 0 0 0 5.39-1.61" />
          <path d="M2 2l20 20" />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}
