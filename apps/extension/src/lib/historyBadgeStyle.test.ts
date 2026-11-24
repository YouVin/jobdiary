import { describe, expect, it } from 'vitest';
import webTailwindConfig from '../../../web/tailwind.config.ts?raw';
import { HISTORY_BADGE_COLORS, HISTORY_BADGE_CSS } from './historyBadgeStyle';

// 배지 색이 웹앱 디자인 시스템 토큰과 갈라지지 않게 묶는다 (#246).
// content script는 Tailwind를 거치지 않아 값을 직접 두므로, 웹앱 설정 파일의 같은 토큰 값과 비교한다.
function token(pattern: RegExp): string {
  const found = webTailwindConfig.match(pattern);
  if (!found) throw new Error(`웹앱 토큰을 찾지 못함: ${pattern}`);
  return found[1].toUpperCase();
}

describe('지원 이력 배지 스타일', () => {
  it('색은 웹앱 디자인 시스템 토큰과 같다', () => {
    expect(HISTORY_BADGE_COLORS.appliedBackground).toBe(token(/action:\s*\{[^}]*?primary:\s*"(#[0-9A-Fa-f]{6})"/));
    expect(HISTORY_BADGE_COLORS.appliedText).toBe(token(/surface:\s*"(#[0-9A-Fa-f]{6})"/));
    expect(HISTORY_BADGE_COLORS.canceledBackground).toBe(token(/subtle:\s*"(#[0-9A-Fa-f]{6})"/));
    expect(HISTORY_BADGE_COLORS.canceledText).toBe(token(/text:\s*\{[^}]*?secondary:\s*"(#[0-9A-Fa-f]{6})"/));
    expect(HISTORY_BADGE_COLORS.canceledBorder).toBe(token(/divider:\s*"(#[0-9A-Fa-f]{6})"/));
  });

  it('모서리 8px·글자 12px/600·높이 24px, 강제 색상 모드는 시스템 색과 점선 취소를 유지한다', () => {
    expect(HISTORY_BADGE_CSS).toContain('border-radius: 8px');
    expect(HISTORY_BADGE_CSS).toContain('font: 600 12px/16px');
    expect(HISTORY_BADGE_CSS).toContain('height: 24px');
    expect(HISTORY_BADGE_CSS).toContain('@media (forced-colors: active)');
    expect(HISTORY_BADGE_CSS).toContain('border-style: dashed');
  });
});
