'use client';

import { clsx } from 'clsx';
import { addTransitionType, startTransition, useMemo, useState, ViewTransition } from 'react';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { ResultRow, StagePills } from '@/components/board/StageSummary';
import { WaitingList } from '@/components/board/WaitingList';
import { WeekTimeline } from '@/components/board/WeekTimeline';
import { ApplicationErrorNotice } from '@/components/dashboard/ApplicationNotices';
import { ApplicationFilters } from '@/components/dashboard/ApplicationFilters';
import { ApplicationPanel } from '@/components/detail/ApplicationPanel';
import { STATUS_ORDER } from '@/constants/status';
import { useApplicationsLoader } from '@/hooks/useApplicationsLoader';
import { useStageMove } from '@/hooks/useStageMove';
import { type BoardView, loadBoardView, saveBoardView } from '@/lib/storage';
import { useApplicationStore } from '@/store/applicationStore';
import type { Status } from '@/types/application';
import { getTodayInKorea } from '@/utils/applicationDeadline';
import { DEFAULT_APPLICATION_FILTERS, filterApplications } from '@/utils/applicationFilters';
import { getWaitingBoard } from '@/utils/waitingList';
import { getWeekTimeline } from '@/utils/weekTimeline';

const VIEW_OPTIONS: Array<{ value: BoardView; label: string }> = [
  { value: 'week', label: '주간' },
  { value: 'kanban', label: '보드' },
];

const EMPTY_MESSAGE = '아직 지원 내역이 없습니다. 지원추가 또는 대시보드의 익스텐션에서 가져오기로 시작해보세요.';

// 머리말 한 줄. 일정이 없으면 없다고 말한다.
function weekLede(offset: number, interviewCount: number, deadlineCount: number): string {
  let subject = '이 주에';
  if (offset === 0) subject = '이번 주에';
  else if (offset === -1) subject = '지난주에';
  else if (offset === 1) subject = '다음 주에';
  if (!interviewCount && !deadlineCount) return `${subject} 잡힌 면접이나 공고 마감이 없어요.`;
  const parts: string[] = [];
  if (interviewCount) parts.push(`면접 ${interviewCount}번`);
  if (deadlineCount) parts.push(`공고 마감 ${deadlineCount}번`);
  return `${subject} ${parts.join(', ')}이 있어요.`;
}

// 지원 보드(/board) (#173~#176)
// - 주간(기본): 단계 버튼 → 주간 타임라인 → 결과 기다리는 중 목록 → 결과가 나온 지원 한 줄
// - 어느 보기든 지원을 누르면 오른쪽 상세 패널(#175)
// - 보드: 기존 검색·필터와 7단계 칸반(드래그)
// 지원 내역 조회는 홈과 같은 훅을 쓰고, 고른 보기는 이 브라우저에 기억한다.
// 보기 전환·주 이동·단계 필터는 transition으로 바꿔 <ViewTransition> 애니메이션을 켠다(#176). 동작은 애니메이션과 무관하다.
export function BoardClient() {
  const isReady = useApplicationsLoader();
  const applications = useApplicationStore((state) => state.applications);
  const error = useApplicationStore((state) => state.error);
  const [view, setView] = useState<BoardView>(loadBoardView);

  // 보드 보기: 검색·필터
  const [filters, setFilters] = useState(DEFAULT_APPLICATION_FILTERS);
  const visibleApplications = useMemo(() => filterApplications(applications, filters), [applications, filters]);

  // 주간 보기·상세 패널: 트랙에서 바꾼 단계는 저장 응답 전에 먼저 보여준다(useStageMove).
  const { optimisticApplications, moveStage, moveError } = useStageMove(applications);
  const [stage, setStage] = useState<Status | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const today = getTodayInKorea();
  const timeline = useMemo(() => getWeekTimeline(optimisticApplications, today, weekOffset), [optimisticApplications, today, weekOffset]);
  const waiting = useMemo(() => getWaitingBoard(optimisticApplications, today, stage), [optimisticApplications, today, stage]);

  // 일정 캡슐·목록의 회사·칸반 카드를 누르면 상세 패널을 연다 (#175).
  // 목록에서 사라지면(삭제·계정 전환) 패널도 그리지 않는다.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedApplication = optimisticApplications.find((application) => application.id === selectedId);

  const changeView = (next: BoardView) => {
    saveBoardView(next);
    startTransition(() => setView(next));
  };

  // 주 이동 방향을 전환 타입으로 넘겨, 다음 주는 왼쪽·이전 주는 오른쪽으로 넘긴다.
  const moveWeek = (next: number) => {
    if (next === weekOffset) return;
    startTransition(() => {
      addTransitionType(next > weekOffset ? 'week-forward' : 'week-back');
      setWeekOffset(next);
    });
  };

  const changeStage = (next: Status | null) => {
    startTransition(() => setStage(next));
  };

  if (!isReady) {
    return (
      // lg:grid-cols-7은 KanbanBoard와 동일한 이유로 고정값(JIT 동적 클래스 purge 문제).
      // 스켈레톤 개수는 실제 컬럼 수와 어긋나지 않도록 STATUS_ORDER.length로 계산.
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-7" aria-busy="true" aria-label="지원 보드를 불러오는 중">
        {Array.from({ length: STATUS_ORDER.length }).map((_, index) => (
          <div key={index} className="min-h-30 animate-pulse rounded-section bg-column" />
        ))}
      </div>
    );
  }

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-heading-lg font-semibold text-text-primary">지원 보드</h1>
          <p className="mt-1 text-body text-text-secondary">
            {weekLede(weekOffset, timeline.interviewCount, timeline.deadlineCount)}
          </p>
        </div>
        <div className="flex rounded-lg border border-card-border bg-card p-1" role="group" aria-label="보기 선택">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={view === option.value}
              onClick={() => changeView(option.value)}
              className={clsx(
                'h-8 rounded-md px-4 text-label focus-visible:outline-2 focus-visible:outline-brand',
                view === option.value ? 'bg-text-primary text-on-brand' : 'text-text-secondary hover:bg-column hover:text-text-primary',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>
      {error && (
        <div className="mb-3">
          <ApplicationErrorNotice error={error} />
        </div>
      )}

      {/* 보기를 바꾸면 key가 바뀌어 이전·새 보기가 교차 페이드된다. */}
      <ViewTransition key={view} name="board-view" share="auto" enter="auto" default="none">
        <div>
          {view === 'week' ? (
            <>
              {!error && applications.length === 0 && (
                <p className="mb-4 rounded-section bg-column p-4 text-body text-text-secondary">{EMPTY_MESSAGE}</p>
              )}
              <StagePills counts={waiting.stageCounts} resultTotal={waiting.resultTotal} stage={stage} onStageChange={changeStage} />
              <WeekTimeline timeline={timeline} offset={weekOffset} onOffsetChange={moveWeek} onSelect={setSelectedId} />
              <WaitingList
                items={waiting.items}
                scheduledCount={waiting.scheduledCount}
                stage={stage}
                moveError={moveError}
                onClearStage={() => changeStage(null)}
                onMove={moveStage}
                onOpen={setSelectedId}
              />
              <ResultRow counts={waiting.resultCounts} total={waiting.resultTotal} />
            </>
          ) : (
            <>
              <ApplicationFilters
                filters={filters}
                onChange={setFilters}
                visibleCount={visibleApplications.length}
                totalCount={applications.length}
              />
              {!error && visibleApplications.length === 0 && (
                <p className="mb-4 rounded-section bg-column p-4 text-body text-text-secondary">
                  {applications.length === 0 ? EMPTY_MESSAGE : '조건에 맞는 지원 내역이 없습니다. 검색어나 필터를 변경해보세요.'}
                </p>
              )}
              <KanbanBoard applications={applications} visibleApplications={visibleApplications} onOpen={setSelectedId} />
            </>
          )}
        </div>
      </ViewTransition>

      {selectedApplication && (
        <ApplicationPanel
          key={selectedApplication.id}
          application={selectedApplication}
          onClose={() => setSelectedId(null)}
          onMove={moveStage}
          moveError={moveError}
        />
      )}
    </>
  );
}
