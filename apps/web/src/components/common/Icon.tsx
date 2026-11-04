import { clsx } from 'clsx';

const ICON_PATHS = {
  plus: '/icons/plus.svg',
  settings: '/icons/settings.svg',
  logout: '/icons/logout.svg',
  warning: '/icons/warning.svg',
  pencil: '/icons/pencil.svg',
  calendar: '/icons/calendar.svg',
  close: '/icons/close.svg',
  'eye-off': '/icons/eye-off.svg',
  eye: '/icons/eye.svg',
  chart: '/icons/chart.svg',
  sparkle: '/icons/sparkle.svg',
} as const;

interface IconProps {
  name: keyof typeof ICON_PATHS;
  className?: string;
}

// SVG 파일은 모양만 관리하고, 마스크 색상은 부모의 text-* 토큰을 상속한다.
// 아이콘은 장식용이다. 의미와 접근성 이름은 부모 버튼/텍스트에서 제공한다.
export function Icon({ name, className = 'h-4 w-4' }: IconProps) {
  const maskImage = `url("${ICON_PATHS[name]}")`;

  return (
    <span
      aria-hidden="true"
      className={clsx('block shrink-0 bg-current mask-contain mask-center mask-no-repeat', className)}
      style={{ maskImage, WebkitMaskImage: maskImage }}
    />
  );
}
