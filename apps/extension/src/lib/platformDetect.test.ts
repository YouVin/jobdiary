import { expect, it } from 'vitest';
import { detectHistoryPlatform, detectPlatform } from './platformDetect';
it('자동 표시 대상 호스트를 정확히 제한한다', () => {
  expect(detectHistoryPlatform('https://www.jobkorea.co.kr/Recruit/GI_Read/101')).toBe('jobkorea');
  expect(detectHistoryPlatform('https://m.saramin.co.kr/job-search/view?rec_idx=101')).toBe('saramin');
  for (const url of ['http://www.jobkorea.co.kr/User/AI', 'https://www.jobkorea.co.kr.evil.test/User/AI',
    'https://www.wanted.co.kr/wd/101', 'https://hiring.saramin.co.kr/', 'https://www.jobkorea.co.kr:8443/User/AI']) {
    expect(detectHistoryPlatform(url)).toBeUndefined();
  }
});
it('표시용 전체 호스트 범위가 수집 가능 경로를 확장하지 않는다', () => {
  for (const url of ['https://www.jobkorea.co.kr/Recruit/GI_Read/101', 'https://www.saramin.co.kr/zf_user/jobs/list/domestic']) {
    expect(detectHistoryPlatform(url)).toBeDefined();
    expect(detectPlatform(url)).toBeUndefined();
  }
});
it('기존 지원현황의 수집 판정은 유지한다', () => {
  expect(detectPlatform('https://www.jobkorea.co.kr/User/ApplyFixture')).toBe('jobkorea');
  expect(detectPlatform('https://www.saramin.co.kr/zf_user/persons/apply-status-list')).toBe('saramin');
  expect(detectPlatform('https://www.wanted.co.kr/status/applications/applied')).toBe('wanted');
});
