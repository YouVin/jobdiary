export const JOBKOREA_SELECTORS = {
  // 컨테이너: 테이블의 각 행 (tr)
  container: 'tbody tr',
  // 지원 행 바로 다음에 추천공고만 담긴 tr을 제외하기 위한 래퍼
  similarRecommendations: '.similar',
  // 데이터 버튼: 각 행에서 data 속성을 담은 버튼 (devBtnDel 또는 devBtnCancel).
  // 이 버튼이 없는 행(빈 tr, 헤더 등)은 지원내역이 아니므로 스킵한다.
  dataButton: '[data-applydate]',
  // 회사명 (button.dataset.memname)
  companyAttr: 'memname',
  // 공고명 (button.dataset.gititle) - 마감표기 없이 깔끔
  positionAttr: 'gititle',
  // 지원일 (button.dataset.applydate) - "20260601235538" 형식, 변환 필요
  appliedAtAttr: 'applydate',
  // 고유ID (button.dataset.idx), 중복 방지용
  externalIdAttr: 'idx',
  // 상태 텍스트 (data 없음), 예: "지원완료", "지원취소"
  status: '.apply-status .item.status',
  // 지원 공고의 마감 표시. 실물 DOM: (~10/31), (상시).
  // 추천공고의 .deadline과 다르며 연도 없는 값은 어댑터가 전달하지 않는다.
  deadline: '.apply-progress .extra',
  // 오래된 지원(.devBtnOldDel 등)은 버튼에 memname/gititle/applydate가 없고 data-idx만 있다.
  // externalId는 최신 행과 동일하게 data-idx 기준으로 통일한다.
  oldDataButton: '[data-idx]',
  // 버튼 data가 없을 때(오래된 지원, 공고 삭제된 행 등) 본문 텍스트에서 읽는 폴백 소스.
  companyFallback: '.company a',
  positionFallback: '.description a',
  appliedAtFallback: '.apply-status .date',
  // 공고 링크 (상대경로) — new URL(href, location.origin)로 절대화해서 쓴다
  url: '.description a',
  // 열람 여부 텍스트("미열람"/"열람") — 클래스(read-not)가 아니라 텍스트로 판별한다
  viewed: '.reading',
  // 페이지네이션 쿼리 파라미터. 대문자 P인 "Page"다 (사람인/원티드의 소문자 page와 다름).
  pageParam: 'Page',
} as const;

// 2026-10-22 공개 GI_Read 공고의 원본 HTML에서 확인한 구조.
export const JOBKOREA_POSTING_SELECTORS = {
  description: 'meta[name="description"]',
  structuredData: 'script[type="application/ld+json"]',
} as const;
