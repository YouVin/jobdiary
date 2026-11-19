'use client';

import { useMemo, useState } from 'react';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { WeekTimeline } from '@/components/board/WeekTimeline';
import { ApplicationErrorNotice } from '@/components/dashboard/ApplicationNotices';
import { ApplicationFilters } from '@/components/dashboard/ApplicationFilters';
import { EditApplicationModal } from '@/components/modal/EditApplicationModal';
import { STATUS_ORDER } from '@/constants/status';
import { useApplicationsLoader } from '@/hooks/useApplicationsLoader';
import { useApplicationStore } from '@/store/applicationStore';
import { getTodayInKorea } from '@/utils/applicationDeadline';
import { DEFAULT_APPLICATION_FILTERS, filterApplications } from '@/utils/applicationFilters';
import { getWeekTimeline } from '@/utils/weekTimeline';

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

// 지원 보드(/board): 위에 주간 타임라인(#173), 아래에 검색·필터와 7단계 칸반. 지원 내역 조회는 홈과 같은 훅을 쓴다.
export function BoardClient() {
  const isReady = useApplicationsLoader();
  const applications = useApplicationStore((state) => state.applications);
  const error = useApplicationStore((state) => state.error);
  const [filters, setFilters] = useState(DEFAULT_APPLICATION_FILTERS);
  const visibleApplications = useMemo(() => filterApplications(applications, filters), [applications, filters]);
  // 주 이동은 이번 주 기준 상대값. 타임라인은 필터와 상관없이 전체 지원으로 계산한다.
  const [weekOffset, setWeekOffset] = useState(0);
  const timeline = useMemo(() => getWeekTimeline(applications, getTodayInKorea(), weekOffset), [applications, weekOffset]);
  // 일정 캡슐을 누르면 칸반 카드와 같은 수정 모달을 연다. 삭제되면 모달도 함께 닫힌다.
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingApplication = applications.find((application) => application.id === editingId);

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
      <header className="mb-6">
        <h1 className="text-heading-lg font-semibold text-text-primary">지원 보드</h1>
        <p className="mt-1 text-body text-text-secondary">
          {weekLede(weekOffset, timeline.interviewCount, timeline.deadlineCount)}
        </p>
      </header>
      <WeekTimeline timeline={timeline} offset={weekOffset} onOffsetChange={setWeekOffset} onSelect={setEditingId} />
      {error && (
        <div className="mb-3">
          <ApplicationErrorNotice error={error} />
        </div>
      )}
      <ApplicationFilters
        filters={filters}
        onChange={setFilters}
        visibleCount={visibleApplications.length}
        totalCount={applications.length}
      />
      {!error && visibleApplications.length === 0 && (
        <p className="mb-4 rounded-section bg-column p-4 text-body text-text-secondary">
          {applications.length === 0
            ? '아직 지원 내역이 없습니다. 지원추가 또는 대시보드의 익스텐션에서 가져오기로 시작해보세요.'
            : '조건에 맞는 지원 내역이 없습니다. 검색어나 필터를 변경해보세요.'}
        </p>
      )}
      <KanbanBoard applications={applications} visibleApplications={visibleApplications} />
      {editingApplication && (
        <EditApplicationModal application={editingApplication} isOpen onClose={() => setEditingId(null)} />
      )}
    </>
  );
}
