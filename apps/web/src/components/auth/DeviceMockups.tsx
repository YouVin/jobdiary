import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { PlatformIcon } from '@/components/badge/PlatformIcon';
import { BrandLogo } from '@/components/common/BrandMark';
import { Icon } from '@/components/common/Icon';

// 로그인 소개의 기기 목업 (#202). 실제 지원 내역이 아닌 예시 화면이며, 화면 전체가 장식이라 부모가 aria-hidden으로 감춘다.
// 기기 속 화면은 디자인 시스템 글자 단계(caption~title-1)로 실제 크기에 그린 뒤 zoom 0.75로 줄인다.
// 그래서 작은 글자도 임의 크기 없이 토큰만 쓰고, 줄인 만큼 자리도 같이 줄어든다(transform과 다름).
// 금속·유리 색은 device-* 토큰(기기 고유색)이다.

// 지난 3주 달력 칸 예시. 회사 이름은 익명(A사·B사)만 쓴다.
type Tile = { day: number; text: string; tone: 'today' | 'peak' | 'applied' | 'light' };

const CALENDAR_TILES: Tile[] = [
  { day: 23, text: '오늘 · 면접 준비', tone: 'today' },
  { day: 20, text: '3곳 지원', tone: 'applied' },
  { day: 19, text: '2곳 지원', tone: 'applied' },
  { day: 18, text: '서류 통과', tone: 'peak' },
  { day: 17, text: '2곳 지원', tone: 'applied' },
  { day: 16, text: '4곳 지원', tone: 'peak' },
  { day: 13, text: '1곳 지원', tone: 'light' },
  { day: 11, text: '2곳 지원', tone: 'applied' },
  { day: 10, text: '1곳 지원', tone: 'light' },
  { day: 6, text: '3곳 지원', tone: 'applied' },
  { day: 4, text: '1곳 지원', tone: 'light' },
  { day: 3, text: '2곳 지원', tone: 'applied' },
];

// 달력 칸 규칙(CalendarCell)과 같은 색 역할: 오늘 마리골드, 많이 지원한 날 파랑, 지원한 날 selected.
const TILE_CLASS: Record<Tile['tone'], { tile: string; text: string }> = {
  today: { tile: 'bg-today text-text-primary', text: '' },
  peak: { tile: 'bg-action-primary text-text-on-color', text: '' },
  applied: { tile: 'bg-selected text-text-primary', text: 'text-text-brand-strong' },
  light: { tile: 'bg-subtle text-text-secondary', text: '' },
};

const DIARY_STATS = [
  ['지원', '24곳'],
  ['기록한 날', '18일'],
  ['서류 통과', '6곳'],
  ['면접', '3번'],
] as const;

// 1024px 이상: 맥북. 소개 영역 오른쪽 끝에서 잘리도록 폭을 고정한다.
// screen을 주면 예시 화면 대신 그것(실제 화면 사진)을 화면 가득 보여준다(#310, 소개 페이지).
export function MacBookMockup({ className, screen }: { className?: string; screen?: ReactNode }) {
  return (
    <div className={clsx('relative w-160 shrink-0', className)}>
      {/* 화면 덮개 */}
      <div className="rounded-t-device-lid bg-linear-to-b from-device-edge to-device-steel p-px">
        <div className="relative h-101 rounded-t-device-lid-inner bg-device-glass px-3 pt-3">
          <span className="absolute top-3 left-1/2 z-10 h-3 w-22 -translate-x-1/2 rounded-b-sm bg-device-glass" />
          <span className="absolute top-4 left-1/2 z-10 size-1 -translate-x-1/2 rounded-full bg-device-hinge" />
          {screen ? (
            <div className="h-full overflow-hidden rounded-t-sm bg-surface">{screen}</div>
          ) : (
            <div className="h-full overflow-hidden rounded-t-sm bg-linear-150 from-selected via-page to-chart-3 pt-8 pl-7">
              <MacBookScreen />
            </div>
          )}
        </div>
      </div>
      {/* 경첩 · 바닥판 · 그림자 */}
      <div className="mx-2 h-1 bg-linear-to-b from-device-hinge to-device-hinge-light" />
      <div className="relative -left-11 h-3 w-182 rounded-b-xl border-b border-device-steel bg-linear-to-b from-device-base via-device-edge via-45% to-device-shade">
        <span className="absolute top-0 left-1/2 h-1 w-31 -translate-x-1/2 rounded-b-sm bg-linear-to-b from-device-shade to-device-edge" />
      </div>
      <div className="mx-auto mt-2 h-4 w-4/5 rounded-full bg-radial from-device-glass/16 to-transparent to-70%" />
    </div>
  );
}

// 맥북 속 앱 창: 왼쪽 달력 칸, 오른쪽 오늘의 질문과 나의 취준일기 요약.
function MacBookScreen() {
  return (
    <div className="flex h-120 flex-col overflow-hidden rounded-tl-md bg-surface shadow-lg [zoom:0.75]">
      <div className="flex h-12 shrink-0 items-center gap-4 border-b border-line-divider px-4">
        <span className="flex gap-1">
          <i className="size-3 rounded-full bg-line-input" />
          <i className="size-3 rounded-full bg-line-input" />
          <i className="size-3 rounded-full bg-line-input" />
        </span>
        <BrandLogo alt="" className="h-4 w-auto" />
        <span className="ml-1 text-label font-semibold text-text-primary">일기</span>
        <span className="text-label text-text-secondary">지원 보드</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="grid w-100 shrink-0 grid-cols-4 content-start gap-3 border-r border-line-divider p-4">
          {CALENDAR_TILES.map((tile) => (
            <div key={tile.day} className={clsx('flex h-20 flex-col justify-between rounded-md p-3 tabular-nums', TILE_CLASS[tile.tone].tile)}>
              <b className="text-title-1 leading-none">{tile.day}</b>
              <span className={clsx('text-label leading-tight', TILE_CLASS[tile.tone].text)}>{tile.text}</span>
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-3 px-5 py-8 text-center">
          <span className="text-label text-text-secondary">오늘의 질문</span>
          <span className="text-title-3 text-text-primary">
            이번 주 지원한 곳 중<br />가장 기대되는 곳은?
          </span>
          <span className="text-label font-semibold text-text-brand">한 줄 적기</span>
          <span className="my-3 h-px w-full bg-line-divider" />
          <span className="text-body font-semibold text-text-logo">나의 취준일기</span>
          <span className="grid grid-cols-2 gap-x-5 gap-y-1 text-left text-label tabular-nums">
            {DIARY_STATS.map(([name, value]) => (
              <span key={name} className="contents">
                <span className="text-text-secondary">{name}</span>
                <b className="font-semibold text-text-primary">{value}</b>
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

// 1024px 미만: 아이폰. 640px 미만에서는 0.9배로 줄여 첫 화면이 너무 길어지지 않게 한다.
// screen을 주면 예시 화면 대신 그것(실제 화면 사진)을 보여준다. 카메라 섬 아래부터 놓는다(#310).
export function IPhoneMockup({ className, screen }: { className?: string; screen?: ReactNode }) {
  return (
    <div className={clsx('relative h-110 w-53 shrink-0 text-left max-sm:[zoom:0.9]', className)}>
      {/* 옆 버튼: 왼쪽 동작 버튼·음량 2개, 오른쪽 전원 */}
      <span className="absolute top-22 -left-px h-6 w-1 rounded-full bg-device-steel" />
      <span className="absolute top-30 -left-px h-10 w-1 rounded-full bg-device-steel" />
      <span className="absolute top-42 -left-px h-10 w-1 rounded-full bg-device-steel" />
      <span className="absolute top-34 -right-px h-15 w-1 rounded-full bg-device-steel" />
      <div className="relative h-full rounded-device-phone bg-linear-135 from-device-edge via-device-steel via-45% to-device-shade p-px shadow-lg">
        <div className="h-full rounded-device-phone-bezel bg-device-glass p-1">
          <div className="relative h-full overflow-hidden rounded-device-phone-screen bg-page">
            <span className="absolute top-2 left-1/2 z-10 h-5 w-16 -translate-x-1/2 rounded-full bg-device-glass" />
            {screen ? <div className="h-full bg-surface pt-9">{screen}</div> : <IPhoneScreen />}
          </div>
        </div>
      </div>
    </div>
  );
}

// 아이폰 속 오늘의 취준일기: 오늘 지원한 곳, 다가오는 일정, 오늘의 한 줄.
function IPhoneScreen() {
  return (
    <div className="flex flex-col gap-3 px-4 pt-14 pb-4 [zoom:0.75]">
      <div className="flex flex-col px-1">
        <span className="text-label text-text-secondary">11월 23일 월요일</span>
        <span className="text-title-2 text-text-primary">오늘의 취준일기</span>
      </div>
      <div className="flex flex-col gap-2 rounded-lg bg-surface p-4">
        <span className="text-label text-text-secondary">오늘 어디에 지원했나요?</span>
        <div className="flex flex-wrap gap-1">
          <span className="flex items-center gap-1 rounded-full bg-subtle py-1 pr-3 pl-1 text-label font-semibold text-text-primary">
            <PlatformIcon platform="saramin" size="sm" className="rounded-full" />
            사람인 2
          </span>
          <span className="flex items-center gap-1 rounded-full bg-subtle py-1 pr-3 pl-1 text-label font-semibold text-text-primary">
            <PlatformIcon platform="jobkorea" size="sm" className="rounded-full" />
            잡코리아 1
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 rounded-lg bg-surface p-4">
        <span className="text-label text-text-secondary">다가오는 일정은?</span>
        <div className="flex items-center justify-between gap-2">
          <span className="text-body font-semibold text-text-primary">B사 1차 면접</span>
          <span className="rounded-sm bg-subtle px-2 text-caption text-text-secondary tabular-nums">D-2</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 rounded-lg bg-surface p-4">
        <span className="text-label text-text-secondary">오늘의 한 줄</span>
        <span className="h-2 w-4/5 rounded-xs bg-line-divider" />
        <span className="h-2 w-3/5 rounded-xs bg-line-divider" />
      </div>
      <span className="flex items-center justify-center gap-1 text-label font-semibold text-text-brand-strong">
        <Icon name="check" className="h-4 w-4" />
        지원 기록은 자동으로 채워졌어요
      </span>
    </div>
  );
}
