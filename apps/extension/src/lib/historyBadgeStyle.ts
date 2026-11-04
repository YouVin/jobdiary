import theme from '../../tailwind.config';

const colors = theme.theme.extend.colors;
export const HISTORY_BADGE_CSS = `
:host { all: initial !important; display: inline-block !important; margin-inline-end: 6px !important;
  vertical-align: middle !important; pointer-events: none !important; }
span { display: inline-block; box-sizing: border-box; max-width: 100%; padding: 2px 6px; border-radius: 4px;
  font: 500 11px/16px system-ui, -apple-system, sans-serif; white-space: nowrap;
  background: ${colors.brand.tint}; color: ${colors.brand.text}; }
span[data-state="canceled"] { background: ${colors.column}; color: ${colors.text.secondary}; }
`;
export const HISTORY_BADGE_LABEL = { applied: '지원 이력 있음', canceled: '지원취소 이력' } as const;
