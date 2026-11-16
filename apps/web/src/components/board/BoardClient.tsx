'use client';

import { useMemo, useState } from 'react';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { ApplicationErrorNotice } from '@/components/dashboard/ApplicationNotices';
import { ApplicationFilters } from '@/components/dashboard/ApplicationFilters';
import { STATUS_ORDER } from '@/constants/status';
import { useApplicationsLoader } from '@/hooks/useApplicationsLoader';
import { useApplicationStore } from '@/store/applicationStore';
import { DEFAULT_APPLICATION_FILTERS, filterApplications } from '@/utils/applicationFilters';

// 지원 보드(/board): 검색·필터와 7단계 칸반. 지원 내역 조회는 홈과 같은 훅을 쓴다.
export function BoardClient() {
  const isReady = useApplicationsLoader();
  const applications = useApplicationStore((state) => state.applications);
  const error = useApplicationStore((state) => state.error);
  const [filters, setFilters] = useState(DEFAULT_APPLICATION_FILTERS);
  const visibleApplications = useMemo(() => filterApplications(applications, filters), [applications, filters]);

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
      <h1 className="mb-4 text-heading-lg font-semibold text-text-primary">지원 보드</h1>
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
    </>
  );
}
