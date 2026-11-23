import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from '@/components/common/Icon';

// 디자인 시스템 아이콘 버튼 (#201). 글자가 없으므로 label(접근성 이름)을 반드시 받는다.
// 누르기 편한 최소 크기 44×44(md). 좁은 곳(탭 안 주 이동)에서만 36(sm).
// 평소에는 배경 없이 회색 아이콘, 마우스를 올리면 옅은 회색 판이 생긴다.
interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  label: string;
  icon: IconName;
  size?: 'md' | 'sm';
}

export function IconButton({ label, icon, size = 'md', type = 'button', className, ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors duration-fast ease-soft hover:bg-subtle hover:text-text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:bg-transparent',
        size === 'md' ? 'h-11 w-11' : 'h-9 w-9',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} className={size === 'md' ? 'h-5 w-5' : 'h-4 w-4'} />
    </button>
  );
}
