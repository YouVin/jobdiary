import { Platform } from '@/types/application';

export const PLATFORM_INFO: Record<Platform, { label: string }> = {
  saramin: { label: '사람인' },
  wanted: { label: '원티드' },
  jobkorea: { label: '잡코리아' },
  manual: { label: '직접입력' },
};

// 익스텐션이 수집하는 지원현황 페이지. 익스텐션 팝업(apps/extension/src/popup/App.tsx)의 바로가기와 같은 주소다.
// 잡코리아는 입사지원현황의 고정 주소가 확인되지 않아 마이페이지가 있는 메인까지만 안내한다.
export const PLATFORM_STATUS_PAGES: Record<Exclude<Platform, 'manual'>, { label: string; url: string }> = {
  saramin: { label: '지원현황 열기', url: 'https://www.saramin.co.kr/zf_user/persons/apply-status-list' },
  jobkorea: { label: '마이페이지 열기', url: 'https://www.jobkorea.co.kr' },
  wanted: { label: '지원현황 열기', url: 'https://www.wanted.co.kr/status/applications/applied' },
};
