import { Platform } from '@/types/application';

export const PLATFORM_INFO: Record<Platform, { label: string; bg: string; text: string }> = {
  saramin: { label: '사람인', bg: '#F4F4F5', text: '#3F3F46' },
  wanted: { label: '원티드', bg: '#EEF2FF', text: '#3730A3' },
  jobkorea: { label: '잡코리아', bg: '#FEF2F2', text: '#991B1B' },
  manual: { label: '직접입력', bg: '#F4F4F5', text: '#3F3F46' },
};
