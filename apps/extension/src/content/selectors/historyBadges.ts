// 경로별 카드 클래스에 의존하지 않는다. 허용 URL과 같은 공고 ID인 텍스트 링크만 표시한다.
export const HISTORY_BADGE_SELECTORS = {
  links: 'a[href]',
  heading: 'h1',
  marker: '[data-jobdiary-history]',
} as const;
