'use client';

import { addTransitionType, startTransition, useMemo, useState, ViewTransition } from 'react';
import { BoardFilters } from '@/components/board/BoardFilters';
import { DuplicateGroups } from '@/components/board/DuplicateGroups';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { ResultRow, StagePills } from '@/components/board/StageSummary';
import { WaitingList } from '@/components/board/WaitingList';
import { WeekTimeline, weekTitle } from '@/components/board/WeekTimeline';
import { ApplicationErrorNotice } from '@/components/dashboard/ApplicationNotices';
import { ApplicationPanel } from '@/components/detail/ApplicationPanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { useApplicationsLoader } from '@/hooks/useApplicationsLoader';
import { useStageMove } from '@/hooks/useStageMove';
import { type BoardView, loadBoardView, saveBoardView } from '@/lib/storage';
import { useApplicationStore } from '@/store/applicationStore';
import type { Status } from '@/types/application';
import { getTodayInKorea } from '@/utils/applicationDeadline';
import { DEFAULT_APPLICATION_FILTERS, filterApplications } from '@/utils/applicationFilters';
import { getDuplicateGroups } from '@/utils/duplicateDetection';
import { getWaitingBoard } from '@/utils/waitingList';
import { getWeekTimeline } from '@/utils/weekTimeline';

// 머리말 한 줄 (#204): 지금 보기에서 가장 먼저 알아야 할 것. 숫자 부분만 진하게.
function Lede({ view, offset, interviewCount, deadlineCount, groupCount }: {
  view: BoardView;
  offset: number;
  interviewCount: number;
  deadlineCount: number;
  groupCount: number;
}) {
  const strong = (text: string) => <b className="font-semibold text-text-primary">{text}</b>;
  if (view === 'kanban') return <>카드를 끌거나 Space로 집어서 단계를 바꿀 수 있어요</>;
  if (view === 'duplicates') {
    return groupCount ? <>같은 공고를 여러 사이트에서 지원한 묶음이 {strong(`${groupCount}개`)} 있어요</> : <>여러 사이트에서 같은 공고에 지원한 건이 없어요</>;
  }
  const subject = weekTitle(offset);
  if (!interviewCount && !deadlineCount) return <>{subject}에는 잡힌 면접이나 공고 마감이 없어요</>;
  const parts: string[] = [];
  if (interviewCount) parts.push(`면접 ${interviewCount}번`);
  if (deadlineCount) parts.push(`공고 마감 ${deadlineCount}번`);
  return <>{subject}에 {strong(parts.join(', '))}이 있어요</>;
}

// 지원 보드(/board) (#173~#176, #204 새 디자인)
// - 위: 제목 h1 + 한 줄 설명 + 보기 탭(주간·보드·중복, 고른 보기는 이 브라우저에 기억)
// - 주간(기본): 단계별 숫자 → 주간 일정 → 결과 기다리는 중 → 결과가 나온 지원 한 줄
// - 보드: 검색·사이트 칩 → 7단계 칸반(끌기·키보드로 단계 이동)
// - 중복: 숫자 3칸 → 묶음별 목록(#186)
// 어느 보기든 지원을 누르면 오른쪽 상세 패널(#175). 보기 전환·주 이동·단계 필터는 transition으로 바꿔 <ViewTransition> 애니메이션을 켠다(#176).
export function BoardClient() {
  const isReady = useApplicationsLoader();
  const applications = useApplicationStore((state) => state.applications);
  const error = useApplicationStore((state) => state.error);
  const [view, setView] = useState<BoardView>(loadBoardView);

  // 보드 보기: 검색·거르기
  const [filters, setFilters] = useState(DEFAULT_APPLICATION_FILTERS);
  const visibleApplications = useMemo(() => filterApplications(applications, filters), [applications, filters]);

  // 주간 보기·상세 패널: 트랙에서 바꾼 단계는 저장 응답 전에 먼저 보여준다(useStageMove).
  const { optimisticApplications, moveStage, moveError } = useStageMove(applications);
  const [stage, setStage] = useState<Status | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const today = getTodayInKorea();
  const timeline = useMemo(() => getWeekTimeline(optimisticApplications, today, weekOffset), [optimisticApplications, today, weekOffset]);
  const waiting = useMemo(() => getWaitingBoard(optimisticApplications, today, stage), [optimisticApplications, today, stage]);
  const duplicateGroups = useMemo(() => getDuplicateGroups(optimisticApplications), [optimisticApplications]);

  // 일정 줄·목록의 연필 버튼·칸반 카드를 누르면 상세 패널을 연다 (#175). 목록에서 사라지면(삭제·계정 전환) 패널도 그리지 않는다.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedApplication = optimisticApplications.find((application) => application.id === selectedId);

  const changeView = (next: string) => {
    saveBoardView(next as BoardView);
    startTransition(() => setView(next as BoardView));
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
      <div className="flex flex-col gap-4" role="status" aria-label="지원 보드를 불러오고 있어요">
        <div className="h-16 w-64 max-w-full rounded-md bg-muted motion-safe:animate-pulse" />
        <div className="h-28 rounded-xl bg-muted motion-safe:animate-pulse" />
        <div className="h-72 rounded-xl bg-muted motion-safe:animate-pulse" />
      </div>
    );
  }

  const isEmpty = !error && applications.length === 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 px-1 pb-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-title-1-sm text-text-primary sm:text-title-1">지원 보드</h1>
          <p className="text-body text-text-secondary">
            <Lede
              view={view}
              offset={weekOffset}
              interviewCount={timeline.interviewCount}
              deadlineCount={timeline.deadlineCount}
              groupCount={duplicateGroups.length}
            />
          </p>
        </div>
        <Tabs
          label="보기 선택"
          value={view}
          onChange={changeView}
          items={[
            { value: 'week', label: '주간' },
            { value: 'kanban', label: '보드' },
            { value: 'duplicates', label: '중복', count: duplicateGroups.length || undefined, countTone: 'danger' },
          ]}
        />
      </div>
      <ApplicationErrorNotice error={error} />

      {isEmpty && (
        <EmptyState
          icon="plus"
          title="아직 기록한 지원이 없어요"
          description="위의 지원 추가나 익스텐션에서 가져오기로 시작해 보세요"
        />
      )}

      {/* 보기를 바꾸면 key가 바뀌어 이전·새 보기가 교차 페이드된다. */}
      <ViewTransition key={view} name="board-view" share="auto" enter="auto" default="none">
        <div className="flex flex-col gap-4">
          {view === 'duplicates' && <DuplicateGroups groups={duplicateGroups} totalCount={applications.length} onOpen={setSelectedId} />}
          {view === 'week' && (
            <>
              <StagePills counts={waiting.stageCounts} resultTotal={waiting.resultTotal} stage={stage} onStageChange={changeStage} />
              <WeekTimeline timeline={timeline} today={today} offset={weekOffset} onOffsetChange={moveWeek} onSelect={setSelectedId} />
              <WaitingList
                items={waiting.items}
                scheduledCount={waiting.scheduledCount}
                stage={stage}
                moveError={moveError}
                onClearStage={() => changeStage(null)}
                onMove={moveStage}
                onOpen={setSelectedId}
              />
              <ResultRow counts={waiting.resultCounts} total={waiting.resultTotal} onShowBoard={() => changeView('kanban')} />
            </>
          )}
          {view === 'kanban' && (
            <>
              <BoardFilters applications={applications} filters={filters} onChange={setFilters} visibleCount={visibleApplications.length} />
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
