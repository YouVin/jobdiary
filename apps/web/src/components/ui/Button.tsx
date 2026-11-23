import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, MouseEvent, Ref } from 'react';
import { Icon, type IconName } from '@/components/common/Icon';

// 디자인 시스템 Button (#201). 종류 5개 × 크기 3개.
// - 한 화면에 주요(primary) 버튼은 하나만 둔다.
// - 글자는 누르면 일어나는 일로 쓴다("지원 추가", "가져오기"). "확인"은 피한다.
// - 비활성·로딩은 native disabled 대신 aria-disabled로 표시해 키보드 포커스와 스크린리더 안내를 유지하고, 누름만 막는다.
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
export type ButtonSize = 'lg' | 'md' | 'sm';

const BASE =
  'relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-colors duration-fast ease-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring aria-disabled:cursor-not-allowed';

// 큰 52 · 보통 40 · 작은 36. 글자 버튼은 좌우 여백을 줄인다.
const SIZE: Record<ButtonSize, string> = {
  lg: 'h-13 text-body',
  md: 'h-10 text-body',
  sm: 'h-9 text-label',
};
const PADDING: Record<ButtonSize, string> = { lg: 'px-5', md: 'px-4', sm: 'px-3' };

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-action-primary text-text-on-color hover:bg-action-hover active:bg-action-pressed motion-safe:active:scale-98 aria-disabled:bg-action-disabled aria-disabled:hover:bg-action-disabled aria-disabled:active:bg-action-disabled aria-disabled:active:scale-100',
  secondary: 'bg-subtle text-text-primary hover:bg-muted aria-disabled:text-text-disabled aria-disabled:hover:bg-subtle',
  outline:
    'bg-surface text-text-primary ring-1 ring-inset ring-line-input hover:bg-subtle aria-disabled:text-text-disabled aria-disabled:hover:bg-surface',
  text: 'px-2 text-text-brand hover:bg-subtle aria-disabled:text-text-disabled aria-disabled:hover:bg-transparent',
  danger: 'bg-danger-tint text-danger-text hover:bg-danger-tint/70 aria-disabled:opacity-60',
};

interface ButtonClassOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
}

// 링크를 버튼 모양으로 쓸 때도 같은 클래스를 쓴다 (예: <Link className={buttonClassName({ variant: 'secondary' })}>).
export function buttonClassName({ variant = 'primary', size = 'md', block = false, className }: ButtonClassOptions = {}): string {
  return clsx(BASE, SIZE[size], variant !== 'text' && PADDING[size], VARIANT[variant], block && 'w-full', className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: IconName;
  isLoading?: boolean;
  loadingLabel?: string; // 로딩 중 스크린리더가 읽을 이름 (기본: 처리 중)
  ref?: Ref<HTMLButtonElement>; // React 19: 일반 prop으로 button까지 내려간다 (화면 전환 뒤 포커스 되돌리기)
}

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  icon,
  isLoading = false,
  loadingLabel = '처리 중',
  disabled = false,
  type = 'button',
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const isInactive = disabled || isLoading;

  // 비활성이면 누름(폼 제출 포함)을 막는다. 포커스와 이름은 그대로 남는다.
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isInactive) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type={type}
      aria-disabled={isInactive || undefined}
      aria-busy={isLoading || undefined}
      onClick={handleClick}
      className={buttonClassName({ variant, size, block, className })}
      {...rest}
    >
      {/* 로딩 중에도 버튼 폭이 바뀌지 않도록 내용은 자리를 지킨 채 숨긴다 */}
      <span className={clsx('inline-flex items-center gap-2', isLoading && 'invisible')}>
        {icon && <Icon name={icon} className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />}
        {children}
      </span>
      {isLoading && (
        <>
          <span aria-hidden="true" className="absolute inset-0 m-auto h-4 w-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />
          <span className="sr-only">{loadingLabel}</span>
        </>
      )}
    </button>
  );
}
