import type { Platform } from '@/types/application'

export const PLATFORM_LABEL: Record<Platform, string> = {
  saramin: '사람인',
  wanted: '원티드',
  jobkorea: '잡코리아',
}

interface PlatformBadgeProps {
  platform?: Platform
}

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  return platform
    ? <span className="diary-platform">{PLATFORM_LABEL[platform]}</span>
    : <span className="text-xs text-diary-secondary">지원현황에서 수집할 수 있어요</span>
}
