'use client';

import { clsx } from 'clsx';
import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { ResultRow, StagePills } from '@/components/board/StageSummary';
import { WaitingList } from '@/components/board/WaitingList';
import { WeekTimeline } from '@/components/board/WeekTimeline';
import { ApplicationErrorNotice } from '@/components/dashboard/ApplicationNotices';
import { ApplicationFilters } from '@/components/dashboard/ApplicationFilters';
import { EditApplicationModal } from '@/components/modal/EditApplicationModal';
import { STATUS_ORDER } from '@/constants/status';
import { useApplicationsLoader } from '@/hooks/useApplicationsLoader';
import { type BoardView, loadBoardView, saveBoardView } from '@/lib/storage';
import { useApplicationStore } from '@/store/applicationStore';
import type { Application, Status } from '@/types/application';
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

// 저장 전에 화면에 먼저 반영할 단계 변경
function applyStatusChange(current: Application[], change: { id: string; status: Status }): Application[] {
  return current.map((application) => (application.id === change.id ? { ...application, status: change.status } : application));
}

// 지원 보드(/board) (#173·#174)
// - 주간(기본): 단계 버튼 → 주간 타임라인 → 결과 기다리는 중 목록 → 결과가 나온 지원 한 줄
// - 보드: 기존 검색·필터와 7단계 칸반(드래그)
// 지원 내역 조회는 홈과 같은 훅을 쓰고, 고른 보기는 이 브라우저에 기억한다.
export function BoardClient() {
  const isReady = useApplicationsLoader();
  const applications = useApplicationStore((state) => state.applications);
  const error = useApplicationStore((state) => state.error);
  const updateStatus = useApplicationStore((state) => state.updateStatus);
  const clearError = useApplicationStore((state) => state.clearError);
  const [view, setView] = useState<BoardView>(loadBoardView);

  // 보드 보기: 검색·필터
  const [filters, setFilters] = useState(DEFAULT_APPLICATION_FILTERS);
  const visibleApplications = useMemo(() => filterApplications(applications, filters), [applications, filters]);

  // 주간 보기: 트랙에서 바꾼 단계는 저장 응답 전에 먼저 보여주고, 실패하면 transition이 끝날 때 원래 값으로 돌아간다.
  const [optimisticApplications, applyOptimisticStatus] = useOptimistic(applications, applyStatusChange);
  const [, startTransition] = useTransition();
  const [moveError, setMoveError] = useState<string | null>(null);
  const [stage, setStage] = useState<Status | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const today = getTodayInKorea();
  const timeline = useMemo(() => getWeekTimeline(optimisticApplications, today, weekOffset), [optimisticApplications, today, weekOffset]);
  const waiting = useMemo(() => getWaitingBoard(optimisticApplications, today, stage), [optimisticApplications, today, stage]);

  // 일정 캡슐·목록의 회사를 누르면 칸반 카드와 같은 수정 모달을 연다. 삭제되면 모달도 함께 닫힌다.
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingApplication = applications.find((application) => application.id === editingId);

  const changeView = (next: BoardView) => {
    setView(next);
    saveBoardView(next);
  };

  const moveStage = (applicationId: string, status: Status) => {
    const company = applications.find((application) => application.id === applicationId)?.company ?? '지원';
    setMoveError(null);
    startTransition(async () => {
      applyOptimisticStatus({ id: applicationId, status });
      const saved = await updateStatus(applicationId, status);
      if (!saved) {
        // 위쪽 공통 오류 안내와 겹치지 않게, 목록 옆 안내 한 곳에만 보여준다.
        clearError();
        setMoveError(`${company}의 단계를 바꾸지 못해 원래대로 되돌렸어요. 잠시 뒤 다시 시도해 주세요.`);
      }
    });
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

      {view === 'week' ? (
        <>
          {!error && applications.length === 0 && (
            <p className="mb-4 rounded-section bg-column p-4 text-body text-text-secondary">{EMPTY_MESSAGE}</p>
          )}
          <StagePills counts={waiting.stageCounts} resultTotal={waiting.resultTotal} stage={stage} onStageChange={setStage} />
          <WeekTimeline timeline={timeline} offset={weekOffset} onOffsetChange={setWeekOffset} onSelect={setEditingId} />
          <WaitingList
            items={waiting.items}
            scheduledCount={waiting.scheduledCount}
            stage={stage}
            moveError={moveError}
            onClearStage={() => setStage(null)}
            onMove={moveStage}
            onOpen={setEditingId}
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
          <KanbanBoard applications={applications} visibleApplications={visibleApplications} />
        </>
      )}

      {editingApplication && (
        <EditApplicationModal application={editingApplication} isOpen onClose={() => setEditingId(null)} />
      )}
    </>
  );
}
