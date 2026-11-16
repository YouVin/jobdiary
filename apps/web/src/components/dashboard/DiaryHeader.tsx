import { buttonClassName } from '@/components/common/buttonStyles';
import { Icon } from '@/components/common/Icon';
import { PLATFORM_INFO, PLATFORM_STATUS_PAGES } from '@/constants/platform';
import type { Platform } from '@/types/application';
import type { ApplicationOverview, StageSummary, UpcomingEvent } from '@/utils/applicationStats';
import { formatKoreanDateTime } from '@/utils/format';

interface DiaryHeaderProps {
  today: string; // YYYY-MM-DD (한국 날짜)
  overview: ApplicationOverview;
  stage: StageSummary;
  nextEvent: UpcomingEvent | undefined;
  platformCounts: Record<Platform, number>;
  lastImportAt: string | null;
  onImport: () => void;
  isRequesting: boolean;
  isExtensionAvailable: boolean;
}

// 익스텐션 팝업과 같은 월 약어
const MONTH_LABELS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May.', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const KIND_LABEL: Record<UpcomingEvent['kind'], string> = { interview: '면접', deadline: '공고 마감' };

// 사이트 칩 색은 익스텐션과 같은 platform 토큰. 클래스는 리터럴로 둔다.
const SITE_CHIPS: { platform: Exclude<Platform, 'manual'>; className: string }[] = [
  { platform: 'saramin', className: 'bg-platform-saramin-bg text-platform-saramin-text' },
  { platform: 'jobkorea', className: 'bg-platform-jobkorea-bg text-platform-jobkorea-text' },
  { platform: 'wanted', className: 'bg-platform-wanted-bg text-platform-wanted-text' },
];

function Strong({ children }: { children: React.ReactNode }) {
  return <b className="font-bold text-brand-text">{children}</b>;
}

// 현황을 한두 문장으로 요약한다. 숫자 타일 대신 일기처럼 읽히게 하려는 선택이다.
function Summary({ overview, stage, nextEvent }: Pick<DiaryHeaderProps, 'overview' | 'stage' | 'nextEvent'>) {
  if (overview.total === 0) {
    return <>아직 기록된 지원이 없어요. 지원추가나 익스텐션 가져오기로 첫 페이지를 채워보세요.</>;
  }

  return (
    <>
      지금까지 <Strong>{overview.total}건</Strong> 지원했고,{' '}
      {stage.inProgress > 0 ? (
        <>
          <Strong>{stage.inProgress}건</Strong>이 아직 소식을 기다리고 있어요.
        </>
      ) : (
        <>진행 중인 지원은 없어요.</>
      )}
      {nextEvent && (
        <>
          {' '}
          {nextEvent.daysLeft === 0 ? '오늘은 ' : `다음 일정은 D-${nextEvent.daysLeft} `}
          <Strong>
            {nextEvent.company} {KIND_LABEL[nextEvent.kind]}
          </Strong>
          {nextEvent.daysLeft === 0 ? '이 있는 날이에요.' : '이에요.'}
        </>
      )}
    </>
  );
}

export function DiaryHeader({
  today, overview, stage, nextEvent, platformCounts, lastImportAt, onImport, isRequesting, isExtensionAvailable,
}: DiaryHeaderProps) {
  const [year, month, day] = today.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(`${today}T00:00:00.000Z`).getUTCDay()];
  const facts = [
    { label: '이번 주 새 지원', value: `${overview.thisWeekCount}건` },
    ...(stage.screeningPassRate === null ? [] : [{ label: '서류 통과율', value: `${Math.round(stage.screeningPassRate * 100)}%` }]),
    { label: '지원한 기업', value: `${overview.companyCount}곳` },
  ];

  return (
    <section aria-label="오늘의 지원 요약" className="overflow-hidden rounded-card border border-card-border bg-card shadow-card">
      <div className="grid grid-cols-1 gap-5 px-5 py-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-8 md:px-8 md:py-7">
        <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-0 md:border-r md:border-card-border md:pr-8">
          <time dateTime={today} aria-label={`${year}년 ${month}월 ${day}일 ${weekday}`} className="flex items-center gap-4 md:flex-col md:items-start md:gap-0">
            <span className="font-diary text-diary-month text-text-secondary">{MONTH_LABELS[month - 1]}</span>
            <span className="font-diary text-diary-day text-text-primary tabular-nums">{day}</span>
          </time>
          <span className="mt-1 text-label text-text-secondary">{year}년 · {weekday}</span>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <p className="max-w-176 text-lead break-keep text-text-primary text-balance">
            <Summary overview={overview} stage={stage} nextEvent={nextEvent} />
          </p>
          <ul className="flex flex-wrap gap-2">
            {facts.map((fact) => (
              <li key={fact.label} className="flex items-baseline gap-2 rounded-full bg-column px-3 py-1 text-label text-text-secondary">
                {fact.label}
                <b className="font-semibold text-text-primary tabular-nums">{fact.value}</b>
              </li>
            ))}
            {stage.autoRejected > 0 && (
              <li className="flex items-baseline gap-2 rounded-full bg-column px-3 py-1 text-label text-text-secondary">
                마감 자동 탈락
                <b className="font-semibold text-status-rejected-text tabular-nums">{stage.autoRejected}건</b>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-card-border bg-page px-5 py-3 md:px-8">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-label text-text-secondary tabular-nums">
            {lastImportAt ? `마지막 가져오기 ${formatKoreanDateTime(lastImportAt)}` : '가져온 기록 없음'}
          </p>
          <ul className="flex flex-wrap gap-2">
            {SITE_CHIPS.map(({ platform, className }) => {
              const { label } = PLATFORM_INFO[platform];
              const page = PLATFORM_STATUS_PAGES[platform];
              return (
                <li key={platform}>
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${label} ${platformCounts[platform]}건 저장됨, ${page.label} (새 탭)`}
                    title={`${label} ${page.label}`}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-label underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${className}`}
                  >
                    {label}
                    <b className="font-semibold tabular-nums">{platformCounts[platform]}</b>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        <button
          type="button"
          onClick={onImport}
          disabled={!isExtensionAvailable || isRequesting}
          title={isExtensionAvailable ? undefined : '크롬 익스텐션을 설치하면 세 사이트의 지원 내역을 한 번에 가져올 수 있어요'}
          className={buttonClassName('secondary')}
        >
          <Icon name="download" className="h-4 w-4" />
          {isRequesting ? '가져오는 중...' : '익스텐션에서 가져오기'}
        </button>
      </div>
    </section>
  );
}
