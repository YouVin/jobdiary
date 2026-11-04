import { Platform } from '@/types/application';

export const PLATFORM_INFO: Record<Platform, { label: string }> = {
  saramin: { label: '사람인' },
  wanted: { label: '원티드' },
  jobkorea: { label: '잡코리아' },
  manual: { label: '직접입력' },
};
