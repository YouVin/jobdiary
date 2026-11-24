// 채용 사이트 화면에 붙는 지원 이력 배지는 사이트 디자인과 섞이지 않게 흑백으로 둔다(#136 사용자 승인).
// 팝업이 웹앱 디자인 시스템으로 바뀌면서(#239) Tailwind 설정의 흑백 팔레트를 지웠으므로 배지 색은 여기서 정한다.
const colors = { ink: '#18181B', paper: '#FFFFFF', secondary: '#52525B' } as const;
export const HISTORY_BADGE_CSS = `
:host { all: initial !important; display: inline-block !important; max-width: 100% !important;
  margin-inline-end: 8px !important; vertical-align: middle !important; pointer-events: none !important; }
.badge { display: inline-flex; align-items: center; gap: 4px; box-sizing: border-box;
  max-width: 100%; padding: 3px 8px; border: 1px solid ${colors.ink}; border-radius: 4px;
  font: 600 12px/16px system-ui, -apple-system, sans-serif; white-space: nowrap;
  background: ${colors.ink}; color: ${colors.paper}; }
.badge[data-state="canceled"] { background: ${colors.paper}; color: ${colors.secondary}; border-color: ${colors.secondary}; }
.symbol { flex: none; display: inline-block; width: 12px; text-align: center; font-size: 12px; line-height: 16px; }
@media (forced-colors: active) {
  .badge { background: Canvas; color: CanvasText; border-color: CanvasText; }
  .badge[data-state="canceled"] { background: Canvas; color: CanvasText; border-color: CanvasText; border-style: dashed; }
}
`;
export const HISTORY_BADGE_LABEL = { applied: '지원 이력 있음', canceled: '지원취소 이력' } as const;
export const HISTORY_BADGE_SYMBOL = { applied: '✓', canceled: '↶' } as const;
