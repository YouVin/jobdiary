import { Platform } from '@/types/application';
import { PLATFORM_INFO } from '@/constants/platform';

interface PlatformBadgeProps {
  platform: Platform;
}

// 플랫폼별 배지 색상 토큰 매핑 (Tailwind가 클래스명을 정적으로 인식하도록 리터럴로 작성)
const PLATFORM_BADGE_CLASS: Record<Platform, string> = {
  saramin: 'bg-platform-saramin-bg text-platform-saramin-text',
  wanted: 'bg-platform-wanted-bg text-platform-wanted-text',
  jobkorea: 'bg-platform-jobkorea-bg text-platform-jobkorea-text',
  manual: 'bg-platform-saramin-bg text-platform-saramin-text',
};

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  const { label } = PLATFORM_INFO[platform];

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-[1px] text-[10px] font-medium leading-none ${PLATFORM_BADGE_CLASS[platform]}`}
    >
      {label}
    </span>
  );
}
