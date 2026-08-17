import { clsx } from 'clsx';
import { PLATFORM_INFO } from '@/constants/platform';
import { Platform } from '@/types/application';

interface DdayMockCard {
  platform: Platform;
  position: string;
  dday: number;
  isNew: boolean;
}

// 예시 데이터 — 실제 지원 내역이 아닌 목업 상수.
const DDAY_CARDS: DdayMockCard[] = [
  { platform: 'saramin', position: '프론트엔드 개발자', dday: 3, isNew: true },
  { platform: 'jobkorea', position: '백엔드 개발자', dday: 5, isNew: true },
  { platform: 'wanted', position: 'UI/UX 디자이너', dday: 7, isNew: false },
];

// 카드/폰 주변 배치는 데스크탑에서만 쓴다(모바일은 카드 자체를 숨김) — 리터럴 클래스라야
// Tailwind가 빌드 시 정적으로 인식한다.
const DDAY_CARD_POSITION: Record<number, string> = {
  0: 'md:left-0 md:top-0 md:-rotate-6',
  1: 'md:left-2 md:bottom-0 md:rotate-3',
  2: 'md:right-0 md:top-0 md:-rotate-3',
};

// 카드의 플랫폼명 텍스트 색 — PlatformBadge(뱃지 알약형)와 달리 여기선 배경 없이 텍스트만 색을 입힌다.
const PLATFORM_TEXT_CLASS: Record<Platform, string> = {
  saramin: 'text-platform-saramin-text',
  wanted: 'text-platform-wanted-text',
  jobkorea: 'text-platform-jobkorea-text',
  manual: 'text-platform-saramin-text',
};

interface AuthVisualPanelProps {
  className?: string;
}

// 로그인 화면의 브랜드 비주얼 영역. 폼(LoginForm)과 달리 화면 크기별로 실제 내용(카드/구 장식 유무,
// 폰 목업 크기)이 달라야 해서, 하나의 마크업에 반응형 클래스만 다르게 줘서 모바일 축약 헤더/데스크탑
// 전체 패널을 표현한다 — 폼처럼 로직을 공유할 필요가 없는 순수 표시 영역이라 컴포넌트를 두 벌 만들지
// 않고 하나로 충분하다.
export function AuthVisualPanel({ className }: AuthVisualPanelProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-b-[2rem] bg-linear-to-br from-brand-tint-100 via-brand-tint-200 to-brand-tint-300 px-6 pb-10 pt-8',
        'md:flex md:w-1/2 md:flex-col md:items-center md:justify-center md:rounded-b-none md:px-8 md:py-16 lg:px-16',
        className,
      )}
    >
      {/* 배경 글로우 2개 — 정보 전달용이 아니므로 스크린리더에서 숨긴다. 흰색도 디자인 토큰(card)을
          그대로 쓴다 — 하드코딩 색상 없음. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-card opacity-60 blur-3xl md:h-96 md:w-96"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-brand-tint-300 opacity-50 blur-3xl md:h-96 md:w-96"
      />
      {/* 반짝이 — 데스크탑 전체 무대에서만 노출 */}
      <Sparkle className="absolute left-[15%] top-8 hidden h-4 w-4 opacity-70 md:block" />
      <Sparkle className="absolute right-[18%] top-24 hidden h-3 w-3 opacity-50 md:block" />
      <Sparkle className="absolute right-[10%] top-1/2 hidden h-3.5 w-3.5 opacity-40 md:block" />

      {/* 콘텐츠(카피/무대)는 max-width로 가운데 정렬 — 배경은 패널 전체(full-bleed)를 채우되
          내용은 초대형 화면에서도 흩어지지 않게 한다. */}
      <div className="relative z-10 mx-auto w-full max-w-md text-center">
        {/* 모바일 전용 로고 — 데스크탑에서는 폼 쪽 로고가 이 역할을 대신하므로 여기선 숨긴다 */}
        <div className="mb-3 flex items-center justify-center gap-2 md:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-[12px] font-bold text-white">
            J
          </div>
          <span className="text-label text-text-primary">취준일기</span>
        </div>

        {/* md~lg 사이(태블릿)는 패널 폭이 좁아 heading-xl이면 "원티드,"가 중간에 잘려 두 줄로 밀린다 —
            heading-lg를 거쳐가는 중간 단계를 둬서 태블릿 폭에서도 한 줄에 들어가게 한다. */}
        <h1 className="text-heading-md text-text-primary md:text-heading-lg lg:text-heading-xl">
          사람인·잡코리아·원티드,
          <br />
          <span className="text-brand">한 곳에서</span>
        </h1>
        {/* 모바일은 카피를 짧게 유지 — 부제는 데스크탑 전체 무대에서만 보여준다 */}
        <p className="mt-2 hidden text-body text-text-secondary md:block">
          지원부터 합격까지, 취준 여정을 한 곳에서 기록하고 관리하세요.
        </p>

        {/* 폰 목업 + D-day 카드 + 구 장식 — 폰을 가운데 두고 카드들이 주변에 떠 있다. 모바일은 소형
            폰 하나만 노출, 카드/구/반짝이는 데스크탑에서만 노출한다. */}
        <div className="relative mt-6 flex w-full justify-center md:mt-10 md:min-h-88 md:max-w-lg md:flex-1 md:items-center lg:min-h-96">
          {/* 구(sphere) — 순수 radial-gradient 원. 톤은 새로 추가한 brand-tint-* 토큰을 CSS 변수로
              참조한다(Tailwind가 theme 색상을 --color-* 변수로도 노출) */}
          <div
            aria-hidden="true"
            className="absolute -right-6 -top-4 hidden h-28 w-28 rounded-full opacity-90 md:block md:h-36 md:w-36 md:bg-[radial-gradient(circle_at_35%_30%,var(--color-card)_0%,var(--color-brand-tint-200)_55%,var(--color-brand-tint-300)_100%)]"
          />

          <PhoneMockup />

          {DDAY_CARDS.map((card, index) => (
            <div
              key={card.platform + card.position}
              className={clsx(
                'hidden rounded-card bg-card p-2.5 shadow-card md:absolute md:block md:w-24 md:p-2 lg:w-36 lg:p-3.5',
                DDAY_CARD_POSITION[index],
              )}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span
                  className={clsx(
                    'text-caption font-medium whitespace-nowrap lg:text-label',
                    PLATFORM_TEXT_CLASS[card.platform],
                  )}
                >
                  {PLATFORM_INFO[card.platform].label}
                </span>
                {card.isNew && (
                  <span className="rounded bg-brand-tint px-1.5 py-px text-badge text-brand-text">NEW</span>
                )}
              </div>
              <p className="mt-2 text-badge text-text-secondary lg:text-caption">{card.position}</p>
              <p className="mt-0.5 text-heading-md text-brand-text lg:text-heading-lg">D-{card.dday}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 스마트폰 형태의 앱 미리보기 목업. 전부 CSS(div)+SVG(라인차트)로 만들어 이미지/3D 에셋이 필요 없다.
// 프레임 비율/구성은 docs/reference/phone-mockup.tsx를 참고했지만 색은 전부 우리 토큰으로 바꿨다
// (primary/oklch → brand, lavender-* → brand-tint-*, muted-foreground → text-secondary).
function PhoneMockup() {
  return (
    <div className="relative z-10 aspect-196/400 w-28 shrink-0 -rotate-3 rounded-[1.6rem] bg-linear-to-b from-brand to-brand-hover p-0.75 shadow-float md:w-36 lg:w-48 lg:rounded-[2.2rem]">
      {/* 화면 */}
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[1.4rem] bg-card px-3 pb-3 pt-4 lg:rounded-4xl lg:px-4 lg:pb-5 lg:pt-6">
        {/* 노치 */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1.5 h-1 w-8 -translate-x-1/2 rounded-full bg-brand-tint-100 lg:top-2 lg:h-1.5 lg:w-12"
        />

        {/* 로고 */}
        <div className="flex items-center gap-1">
          <div className="flex h-3 w-3 items-center justify-center rounded-[3px] bg-brand text-[6px] font-bold text-white lg:h-4 lg:w-4 lg:text-[8px]">
            J
          </div>
          <span className="text-[7px] font-bold text-text-primary lg:text-[10px]">취준일기</span>
        </div>

        {/* Good Luck 헤딩 — 별도 폰트 없이 기존 Pretendard 볼드로 표현 */}
        <div className="mt-3 text-center lg:mt-6">
          <p className="text-[12px] font-black leading-tight text-brand lg:text-2xl">Good</p>
          <p className="text-[12px] font-black leading-tight text-brand lg:text-2xl">Luck!</p>
          <p className="mt-1 text-[6px] text-text-secondary lg:mt-2 lg:text-[10px]">오늘도 응원할게요 🙂</p>
        </div>

        {/* 진행률 */}
        <div className="mt-3 flex items-center gap-1.5 lg:mt-6 lg:gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-brand-tint-100 lg:h-2">
            <div className="h-full w-3/4 rounded-full bg-brand" />
          </div>
          <span className="text-[6px] font-medium text-text-secondary lg:text-[10px]">79%</span>
        </div>

        {/* 차트 카드 */}
        <div className="mt-2 flex-1 rounded-lg bg-brand-tint-100 p-1.5 lg:mt-4 lg:rounded-xl lg:p-3">
          <div className="flex items-end justify-between">
            <div className="h-1 w-6 rounded-full bg-brand-tint-300 lg:h-1.5 lg:w-10" />
            <div className="h-1 w-4 rounded-full bg-brand-tint-200 lg:h-1.5 lg:w-6" />
          </div>
          <svg viewBox="0 0 120 60" fill="none" className="mt-1.5 h-auto w-full text-brand lg:mt-3" aria-hidden="true">
            <path
              d="M2 46 L24 40 L44 44 L66 24 L88 30 L116 8"
              stroke="currentColor"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="116" cy="8" r={6} fill="currentColor" />
          </svg>
        </div>
      </div>
    </div>
  );
}

interface SparkleProps {
  className?: string;
}

// 장식용 반짝이 SVG(4각 별). 정보를 담지 않으므로 항상 aria-hidden으로 그린다.
function Sparkle({ className }: SparkleProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={clsx('text-brand', className)}>
      <path
        d="M12 0c.7 5.9 5.4 10.6 12 12-6.6 1.4-11.3 6.1-12 12-.7-5.9-5.4-10.6-12-12C6.6 10.6 11.3 5.9 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}
