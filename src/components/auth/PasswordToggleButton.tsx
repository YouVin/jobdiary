import { Icon } from '@/components/common/Icon';
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
      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {isVisible ? (
        <Icon name="eye-off" className="h-4 w-4" />
      ) : (
        <Icon name="eye" className="h-4 w-4" />
      )}
    </button>
  );
}
