'use client';

import { useExtensionImportState } from '@/components/import/ExtensionImportProvider';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StatCell, StatGroup } from '@/components/ui/StatCell';
import { textLinkClassName } from '@/components/ui/TextLink';
import { PLATFORM_INFO, PLATFORM_STATUS_PAGES } from '@/constants/platform';
import type { Platform } from '@/types/application';
import type { ApplicationOverview, StageSummary, UpcomingEvent } from '@/utils/applicationStats';
import { formatKoreanDateTime } from '@/utils/format';

interface SummaryCardProps {
  today: string; // YYYY-MM-DD (한국 날짜)
  overview: ApplicationOverview;
  stage: StageSummary;
  nextEvent: UpcomingEvent | undefined;
  platformCounts: Record<Platform, number>;
  style?: React.CSSProperties; // 첫 화면 카드가 차례로 올라오는 지연
}

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const KIND_LABEL: Record<UpcomingEvent['kind'], string> = { interview: '면접', deadline: '공고 마감' };
const SITES: Exclude<Platform, 'manual'>[] = ['saramin', 'jobkorea', 'wanted'];

function Num({ children }: { children: React.ReactNode }) {
  return <span className="text-text-brand tabular-nums">{children}</span>;
}

// 메인 맨 위 요약 (#203, 캔버스 메인 시안). 날짜 → 한 문장(h1) → 다음 일정 → 숫자 4칸 → 마지막 가져오기 줄.
// 페이지 제목(h1)을 문장으로 써서 처음 듣는 사람도 지금 상황부터 알 수 있게 한다.
export function SummaryCard({ today, overview, stage, nextEvent, platformCounts, style }: SummaryCardProps) {
  const { lastImportAt } = useExtensionImportState();
  const [, month, day] = today.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(`${today}T00:00:00.000Z`).getUTCDay()];
  const passRate = stage.screeningPassRate === null ? '-' : Math.round(stage.screeningPassRate * 100);

  return (
    <Card aria-labelledby="summary-title" gap="lg" className="motion-safe:animate-rise" style={style}>
      {/* ── 위: 오늘 날짜 → 한 문장 요약(h1) → 다음 일정 ── */}
      <div className="flex flex-col gap-2">
        <p className="text-label text-text-secondary">
          <time dateTime={today}>{`${month}월 ${day}일 ${weekday}`}</time>
        </p>
        <h1 id="summary-title" className="text-title-1-sm text-balance break-keep text-text-primary sm:text-title-1">
          {overview.total === 0 ? (
            '아직 기록한 지원이 없어요'
          ) : (
            <>
              지금까지 <Num>{overview.total}건</Num> 지원했고,{' '}
              {stage.inProgress > 0 ? (
                <>
                  <Num>{stage.inProgress}건</Num>이 소식을 기다리고 있어요
                </>
              ) : (
                '진행 중인 지원은 없어요'
              )}
            </>
          )}
        </h1>
        {overview.total === 0 ? (
          <p className="text-body text-text-secondary">위의 지원 추가나 익스텐션 가져오기로 첫 기록을 남겨 보세요.</p>
        ) : (
          nextEvent && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-text-secondary">
              <span>
                {nextEvent.daysLeft === 0 ? '오늘 ' : '다음 일정은 '}
                <b className="font-semibold text-text-primary">
                  {nextEvent.company} {KIND_LABEL[nextEvent.kind]}
                </b>
                {nextEvent.daysLeft === 0 ? '이 있어요' : '이에요'}
              </span>
              {/* 마리골드는 오늘·D-day에만 쓴다 */}
              {nextEvent.daysLeft === 0 ? <Badge tone="today">D-DAY</Badge> : <span className="tabular-nums">· D-{nextEvent.daysLeft}</span>}
            </p>
          )
        )}
      </div>

      {/* ── 숫자 4칸 ── */}
      <StatGroup label="요약 숫자" className="border-t border-line-divider pt-5">
        <StatCell label="이번 주 새 지원" value={overview.thisWeekCount} unit="건" animate />
        <StatCell label="서류 통과율" value={passRate} unit={passRate === '-' ? undefined : '%'} animate />
        <StatCell label="지원한 기업" value={overview.companyCount} unit="곳" animate />
        <StatCell label="마감 자동 탈락" value={stage.autoRejected} unit="건" animate />
      </StatGroup>

      {/* ── 아래: 마지막 가져오기·사이트별 저장 건수 ── */}
      {/* 사이트 이름은 그 사이트의 지원 현황 페이지로 가는 링크(새 탭)다 */}
      <p className="text-label text-text-secondary tabular-nums">
        {lastImportAt ? `마지막 가져오기 ${formatKoreanDateTime(lastImportAt)}` : '아직 가져온 기록이 없어요'}
        {SITES.map((platform) => {
          const { label } = PLATFORM_INFO[platform];
          const page = PLATFORM_STATUS_PAGES[platform];
          return (
            <span key={platform}>
              {' · '}
              <a href={page.url} target="_blank" rel="noopener noreferrer" className={textLinkClassName('quiet', 'text-text-secondary')}>
                {label} {platformCounts[platform]}
                <span className="sr-only">건 저장됨, {page.label} (새 탭에서 열림)</span>
              </a>
            </span>
          );
        })}
      </p>
    </Card>
  );
}
