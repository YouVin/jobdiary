import { clsx } from 'clsx';

// 문장 안이나 이름표 옆의 글자 링크 (#202). next/link의 <Link className={textLinkClassName()}>처럼 쓴다.
// - brand: 다음 행동으로 가는 링크 (가입하기, 비밀번호 찾기). 파란 굵은 글자.
// - quiet: 문장 속 참고 링크 (이용약관). 본문색 + 밑줄로 링크임을 색 말고도 알린다.
export type TextLinkTone = 'brand' | 'quiet';

const TONE: Record<TextLinkTone, string> = {
  brand: 'font-semibold text-text-brand hover:text-action-hover hover:underline',
  quiet: 'text-text-primary underline underline-offset-2 hover:text-text-brand',
};

export function textLinkClassName(tone: TextLinkTone = 'brand', className?: string): string {
  return clsx(
    'cursor-pointer rounded-xs transition-colors duration-fast focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
    TONE[tone],
    className,
  );
}
