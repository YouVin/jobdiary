import { clsx } from 'clsx';
import { StageTrack } from '@/components/board/StageTrack';
import { STATUS_INFO } from '@/constants/status';
import type { Platform, Status } from '@/types/application';
import type { WaitingItem } from '@/utils/waitingList';
import { ACTIVE_STATUSES } from '@/utils/weekTimeline';

interface WaitingListProps {
  items: WaitingItem[];
  scheduledCount: number;
  stage: Status | null;
  moveError: string | null;
  onClearStage: () => void;
  onMove: (applicationId: string, status: Status) => void;
  onOpen: (applicationId: string) => void;
}

// 회사 이니셜 옆 플랫폼 점. 도넛 차트와 같은 진한 플랫폼 색이다.
const PLATFORM_DOT_CLASS: Record<Platform, string> = {
  saramin: 'bg-platform-saramin-chart',
  wanted: 'bg-platform-wanted-chart',
  jobkorea: 'bg-platform-jobkorea-chart',
  manual: 'bg-platform-manual-chart',
};

// 넓은 화면 열: 회사 | 단계 트랙 | 다음 일정 | 지원 후
const ROW_GRID = 'lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)_128px_72px] lg:gap-x-6';

function companyInitial(company: string): string {
  return company.replace(/\(주\)|주식회사|[()]/g, '').trim().charAt(0) || '?';
}

function shortDate(date: string): string {
  return `${Number(date.slice(5, 7))}.${date.slice(8, 10)}`;
}

function WaitingRow({ item, onMove, onOpen }: { item: WaitingItem; onMove: WaitingListProps['onMove']; onOpen: WaitingListProps['onOpen'] }) {
  const { application, stageIndex, waitDays, isStale, nextEvent } = item;
  let waitNote = '지원 후';
  if (isStale) waitNote = '소식 없음';
  else if (application.status === 'applied') waitNote = '결과 대기';

  return (
    <li className={clsx('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-page lg:px-6', ROW_GRID)}>
      <button
        type="button"
        onClick={() => onOpen(application.id)}
        className="group flex min-w-0 items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-section bg-column text-small font-semibold text-text-secondary" aria-hidden="true">
          {companyInitial(application.company)}
          <span className={clsx('absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-card', PLATFORM_DOT_CLASS[application.platform])} />
        </span>
        <span className="min-w-0">
          <b className="block truncate text-body font-semibold text-text-primary group-hover:text-brand-text">{application.company}</b>
          <span className="block truncate text-caption text-text-muted">{application.position}</span>
        </span>
      </button>

      <div className="col-span-2 row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1">
        {/* 좁은 화면에는 열 머리가 없어 트랙 아래에 단계 이름을 둔다. */}
        <StageTrack company={application.company} stageIndex={stageIndex} onMove={(status) => onMove(application.id, status)} labelsClassName="lg:hidden" />
      </div>

      <p className={clsx('col-span-2 row-start-3 text-caption text-text-muted tabular-nums lg:col-span-1 lg:col-start-3 lg:row-start-1', !nextEvent && 'hidden lg:block')}>
        {nextEvent && (
          <>
            <b className="mr-1 font-semibold text-text-secondary">
              {nextEvent.kind === 'interview' ? '면접' : '마감'} D-{nextEvent.daysLeft}
            </b>
            {shortDate(nextEvent.date)}
          </>
        )}
      </p>

      <p className={clsx('col-start-2 row-start-1 text-right text-small font-semibold tabular-nums lg:col-start-4', isStale ? 'text-status-rejected-text' : 'text-text-secondary')}>
        {waitDays}일
        <small className={clsx('block text-caption font-normal', isStale ? 'text-status-rejected-text' : 'text-text-muted')}>{waitNote}</small>
      </p>
    </li>
  );
}

// 진행 중이지만 이번 주 일정이 없는 지원. 오래 기다린 순이며, 트랙 점으로 단계를 바로 바꾼다.
export function WaitingList({ items, scheduledCount, stage, moveError, onClearStage, onMove, onOpen }: WaitingListProps) {
  return (
    <section aria-labelledby="waiting-title" className="mb-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="waiting-title" className="flex items-baseline gap-2 text-heading-md font-semibold text-text-primary">
          결과 기다리는 중
          <span className="text-small font-medium text-text-muted tabular-nums">{items.length}</span>
          {stage && (
            <span className="text-small font-medium text-text-secondary">· {STATUS_INFO[stage].label}만</span>
          )}
        </h2>
        {stage ? (
          <button type="button" onClick={onClearStage} className="text-label text-brand-text hover:underline focus-visible:outline-2 focus-visible:outline-brand">
            전체 보기
          </button>
        ) : (
          <p className="text-caption text-text-muted">오래 기다린 순</p>
        )}
      </div>

      {moveError && (
        <p role="alert" className="mb-3 rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-3 py-2 text-small text-status-rejected-text">
          {moveError}
        </p>
      )}

      <div className="overflow-hidden rounded-card border border-card-border bg-card">
        <div className={clsx('hidden border-b border-card-border px-6 py-2 text-caption text-text-muted lg:grid', ROW_GRID)} aria-hidden="true">
          <span>회사</span>
          <span className="grid grid-cols-4 text-center">
            {ACTIVE_STATUSES.map((status) => (
              <span key={status}>{STATUS_INFO[status].label}</span>
            ))}
          </span>
          <span>다음 일정</span>
          <span className="text-right">지원 후</span>
        </div>
        {items.length ? (
          <ul className="divide-y divide-card-border">
            {items.map((item) => (
              <WaitingRow key={item.application.id} item={item} onMove={onMove} onOpen={onOpen} />
            ))}
          </ul>
        ) : (
          <p className="p-6 text-small text-text-secondary">기다리는 지원이 없어요.</p>
        )}
      </div>
      {scheduledCount > 0 && (
        <p className="mt-2 text-caption text-text-muted">이번 주 일정이 있는 {scheduledCount}건은 위 주간 타임라인에 있어요.</p>
      )}
    </section>
  );
}
