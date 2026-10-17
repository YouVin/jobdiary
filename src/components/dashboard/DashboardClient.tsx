'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { buttonClassName } from '@/components/common/buttonStyles';
import { ApplicationFilters } from '@/components/dashboard/ApplicationFilters';
import { STATUS_ORDER } from '@/constants/status';
import { useExtensionImport } from '@/hooks/useExtensionImport';
import { useApplicationStore } from '@/store/applicationStore';
import { DEFAULT_APPLICATION_FILTERS, filterApplications } from '@/utils/applicationFilters';
import { getTodayInKorea } from '@/utils/applicationDeadline';

const noopSubscribe = () => () => {};

export function DashboardClient() {
  // 서버에서는 항상 false, 하이드레이션 후 클라이언트에서만 true (hydration mismatch 방지)
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const applications = useApplicationStore((state) => state.applications);
  const [filters, setFilters] = useState(DEFAULT_APPLICATION_FILTERS);
  const visibleApplications = useMemo(() => filterApplications(applications, filters), [applications, filters]);
  const isLoading = useApplicationStore((state) => state.isLoading);
  const error = useApplicationStore((state) => state.error);
  const loadApplications = useApplicationStore((state) => state.loadApplications);
  const { requestImport, isRequesting, isExtensionAvailable, importSummary, dismissImportSummary } =
    useExtensionImport();

  // AuthGuard가 로그인 상태에서만 이 컴포넌트를 마운트시키므로, 마운트 시 바로 조회한다.
  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    let loadedDay = getTodayInKorea();
    const refreshOnNewDay = () => {
      if (document.visibilityState !== 'visible') return;
      const today = getTodayInKorea();
      if (today === loadedDay) return;
      loadedDay = today;
      void loadApplications();
    };
    document.addEventListener('visibilitychange', refreshOnNewDay);
    const timer = window.setInterval(refreshOnNewDay, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', refreshOnNewDay);
      window.clearInterval(timer);
    };
  }, [loadApplications]);

  // 익스텐션이 "취준일기 열기"로 붙인 ?import=1 신호를 감지하면 자동으로 가져오기를 실행한다.
  // 처리 전에 먼저 URL에서 신호를 지워, 새로고침해도 다시 트리거되지 않게 한다(중복 방지).
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    if (url.searchParams.get('import') !== '1') {
      return;
    }

    url.searchParams.delete('import');
    window.history.replaceState({}, '', url.toString());

    requestImport();
  }, [requestImport]);

  if (!mounted || isLoading) {
    return (
      // lg:grid-cols-7은 KanbanBoard와 동일한 이유로 고정값(JIT 동적 클래스 purge 문제).
      // 스켈레톤 개수는 실제 컬럼 수와 어긋나지 않도록 STATUS_ORDER.length로 계산.
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-7">
        {Array.from({ length: STATUS_ORDER.length }).map((_, index) => (
          <div key={index} className="min-h-30 animate-pulse rounded-section bg-column" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={requestImport}
          disabled={!isExtensionAvailable || isRequesting}
          title={isExtensionAvailable ? undefined : '익스텐션이 설치되어 있지 않습니다'}
          className={buttonClassName('secondary')}
        >
          {isRequesting ? '가져오는 중...' : '익스텐션에서 가져오기'}
        </button>
      </div>
      {error && (
        <div className="mb-3 rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-3 py-2 text-small text-status-rejected">
          {error}
        </div>
      )}
      {importSummary && (
        <div
          className={
            importSummary.error
              ? 'mb-3 flex items-start justify-between gap-3 rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-3 py-2 text-small text-status-rejected'
              : 'mb-3 flex items-start justify-between gap-3 rounded-lg border border-brand/20 bg-brand-tint px-3 py-2 text-small text-brand-text'
          }
        >
          <span>
            {importSummary.error
              ? `익스텐션 수집 데이터 저장 실패: ${importSummary.error}`
              : `익스텐션에서 ${importSummary.addedCount}건 추가, ${importSummary.duplicateCount}건 다른 플랫폼 중복, ${importSummary.skippedCount}건 기존 내역으로 건너뛰었습니다.`}
          </span>
          <button
            type="button"
            onClick={dismissImportSummary}
            aria-label="알림 닫기"
            className="shrink-0 text-label font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            닫기
          </button>
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
            ? '아직 지원 내역이 없습니다. 지원추가 또는 익스텐션에서 가져오기로 시작해보세요.'
            : '조건에 맞는 지원 내역이 없습니다. 검색어나 필터를 변경해보세요.'}
        </p>
      )}
      <KanbanBoard applications={applications} visibleApplications={visibleApplications} />
    </>
  );
}
