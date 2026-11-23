import { clsx } from 'clsx';
import Image from 'next/image';
import type { Platform } from '@/types/application';

interface PlatformIconProps {
  platform: Platform;
  size?: 'sm' | 'md';
  className?: string;
}

// 사이트 공식 탭 아이콘 원본(public/brands/, 출처는 docs/DESIGN_SYSTEM.md). 각 회사의 상표이며
// 어느 사이트에서 지원했는지 표시하는 용도로만 원본 그대로 쓴다(색·모양을 바꾸지 않는다).
const ICON_SRC: Record<Exclude<Platform, 'manual'>, string> = {
  saramin: '/brands/saramin.png',
  jobkorea: '/brands/jobkorea.png',
  wanted: '/brands/wanted.png',
};

// 모든 사이트를 같은 크기·같은 모서리의 칸에 담는다 (#193).
// 사람인 아이콘은 그 자체가 파란 사각형이라 칸을 꽉 채우고, 투명 바탕인 잡코리아·원티드는 흰 칸 안에 같은 여백으로 둔다.
const TILE_CLASS = { sm: 'h-4 w-4 rounded', md: 'h-7 w-7 rounded-sm' } as const;
const INNER_CLASS = { sm: 'h-3 w-3', md: 'h-5 w-5' } as const;

// 장식 아이콘이다. 사이트 이름은 옆 글자나 부모의 접근성 이름이 전한다.
export function PlatformIcon({ platform, size = 'md', className }: PlatformIconProps) {
  const tile = clsx(
    'relative flex shrink-0 items-center justify-center overflow-hidden ring-1 ring-inset ring-card-border',
    TILE_CLASS[size],
    className,
  );

  if (platform === 'manual') {
    return (
      <span aria-hidden="true" className={clsx(tile, 'bg-column font-bold text-text-secondary', size === 'sm' ? 'text-badge' : 'text-body')}>
        +
      </span>
    );
  }

  const isFullBleed = platform === 'saramin';
  return (
    <span aria-hidden="true" className={clsx(tile, 'bg-raised')}>
      <Image
        src={ICON_SRC[platform]}
        alt=""
        width={64}
        height={64}
        unoptimized
        className={isFullBleed ? 'h-full w-full object-cover' : INNER_CLASS[size]}
      />
    </span>
  );
}
