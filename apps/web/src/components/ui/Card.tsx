import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

// 디자인 시스템 카드 (#201). 회색 페이지 위의 흰 판. 그림자와 테두리는 없다.
// 순서는 항상 ① 제목 줄(CardHeader) ② 한 줄 요약(CardSummary) ③ 내용 ④ 아래 링크.
// 안쪽 24(모바일 20), 모서리 20, 카드 사이 16은 부모 레이아웃의 gap-4로 둔다.
// 여백·간격을 바꿀 때는 className에 p-·gap-를 덧붙이지 말고 padding·gap을 쓴다.
// 같은 속성의 클래스 두 개는 어느 쪽이 이길지 CSS 순서에 달려 있어 화면마다 달라질 수 있다(#204).
const PADDING = {
  md: 'p-5 sm:p-6', // 기본
  sm: 'px-5 py-4 sm:px-6', // 한 줄짜리 카드
  xs: 'p-2', // 버튼이 판 끝까지 차는 카드 (단계별 숫자)
  flush: 'py-5 sm:py-6', // 좌우는 안쪽 줄이 직접 채운다 (표 같은 목록)
} as const;
const GAP = { md: 'gap-4', lg: 'gap-6', none: 'gap-0' } as const;

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'article' | 'div';
  padding?: keyof typeof PADDING;
  gap?: keyof typeof GAP;
}

export function Card({ as: Element = 'section', padding = 'md', gap = 'md', className, children, ...rest }: CardProps) {
  return (
    <Element className={clsx('flex flex-col rounded-xl bg-surface', PADDING[padding], GAP[gap], className)} {...rest}>
      {children}
    </Element>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  titleId?: string; // 카드에 aria-labelledby로 연결할 때
  meta?: ReactNode; // 오른쪽 보조 숫자 (예: 진행 중 9건)
  action?: ReactNode; // 오른쪽 링크·버튼
  level?: 2 | 3;
}

export function CardHeader({ title, titleId, meta, action, level = 2 }: CardHeaderProps) {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <div className="flex items-baseline justify-between gap-3">
      <Heading id={titleId} className="text-title-3 text-text-primary">
        {title}
      </Heading>
      {(meta || action) && (
        <div className="flex shrink-0 items-baseline gap-3">
          {meta && <span className="text-label text-text-secondary tabular-nums">{meta}</span>}
          {action}
        </div>
      )}
    </div>
  );
}

// 카드 맨 위 한 줄 요약. 숫자를 먼저 쓴다 ("9건 모두 서류 결과를 기다리고 있어요").
export function CardSummary({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx('text-title-2 text-text-primary', className)}>{children}</p>;
}
