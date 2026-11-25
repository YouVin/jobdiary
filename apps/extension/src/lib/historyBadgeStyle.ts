// 채용 사이트 화면에 붙는 지원 이력 배지 (#246). 웹앱 디자인 시스템(#199, 팝업 #239)과 같은 색·모서리·글자를 쓴다.
// 사이트 화면 위에서 눈에 띄어야 해서(#135 피드백) 지원 이력은 주요 파랑 바탕 + 흰 글자, 지원취소는 옅은 회색으로 낮춘다.
// content script는 Tailwind를 거치지 않으므로 값을 여기 두고, 웹앱 tailwind.config.ts 토큰과 같은지 테스트로 묶는다.
export const HISTORY_BADGE_COLORS = {
  appliedBackground: '#3461D1', // colors.action.primary (흰 글자 5.56:1)
  appliedText: '#FFFFFF', // colors.surface
  canceledBackground: '#F5F7FA', // colors.subtle
  canceledText: '#5A6478', // colors.text.secondary (5.95:1 흰 바탕 기준)
  canceledBorder: '#E6E9EF', // colors.line.divider
} as const;
const colors = HISTORY_BADGE_COLORS;
export const HISTORY_BADGE_CSS = `
:host { all: initial !important; display: inline-block !important; max-width: 100% !important;
  margin-inline-end: 8px !important; vertical-align: middle !important; pointer-events: none !important; }
.badge { display: inline-flex; align-items: center; gap: 4px; box-sizing: border-box; height: 24px;
  max-width: 100%; padding: 0 8px; border: 1px solid ${colors.appliedBackground}; border-radius: 8px;
  font: 600 12px/16px 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif;
  white-space: nowrap; -webkit-font-smoothing: antialiased;
  background: ${colors.appliedBackground}; color: ${colors.appliedText}; }
.badge[data-state="canceled"] { background: ${colors.canceledBackground}; color: ${colors.canceledText}; border-color: ${colors.canceledBorder}; }
.symbol { flex: none; display: inline-block; width: 12px; text-align: center; font-size: 12px; line-height: 16px; }
@media (forced-colors: active) {
  .badge { background: Canvas; color: CanvasText; border-color: CanvasText; }
  .badge[data-state="canceled"] { background: Canvas; color: CanvasText; border-color: CanvasText; border-style: dashed; }
}
`;
export const HISTORY_BADGE_LABEL = { applied: '지원 이력 있음', canceled: '지원취소 이력' } as const;
export const HISTORY_BADGE_SYMBOL = { applied: '✓', canceled: '↶' } as const;
