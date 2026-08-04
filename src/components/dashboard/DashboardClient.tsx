'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useApplicationStore } from '@/store/applicationStore';
import { useExtensionImport } from '@/hooks/useExtensionImport';
import { STATUS_ORDER } from '@/constants/status';
import { KanbanBoard } from '@/components/board/KanbanBoard';

const noopSubscribe = () => () => {};

export function DashboardClient() {
  // 서버에서는 항상 false, 하이드레이션 후 클라이언트에서만 true (hydration mismatch 방지)
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const applications = useApplicationStore((state) => state.applications);
  const isLoading = useApplicationStore((state) => state.isLoading);
  const error = useApplicationStore((state) => state.error);
  const loadApplications = useApplicationStore((state) => state.loadApplications);
  const { requestImport, isRequesting, isExtensionAvailable, importSummary, dismissImportSummary } =
    useExtensionImport();

  // AuthGuard가 로그인 상태에서만 이 컴포넌트를 마운트시키므로, 마운트 시 바로 조회한다.
  useEffect(() => {
    loadApplications();
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
          <div key={index} className="min-h-30 animate-pulse rounded-[10px] bg-column" />
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
          className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRequesting ? '가져오는 중...' : '익스텐션에서 가져오기'}
        </button>
      </div>
      {error && (
        <div className="mb-3 rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-3 py-2 text-[13px] text-status-rejected">
          {error}
        </div>
      )}
      {importSummary && (
        <div
          className={
            importSummary.error
              ? 'mb-3 flex items-start justify-between gap-3 rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-3 py-2 text-[13px] text-status-rejected'
              : 'mb-3 flex items-start justify-between gap-3 rounded-lg border border-brand/20 bg-brand-tint px-3 py-2 text-[13px] text-brand-text'
          }
        >
          <span>
            {importSummary.error
              ? `익스텐션 수집 데이터 저장 실패: ${importSummary.error}`
              : `익스텐션에서 ${importSummary.addedCount}건 추가, ${importSummary.duplicateCount}건 중복, ${importSummary.updatedCount}건 업데이트, ${importSummary.skippedCount}건 스킵됐습니다.`}
          </span>
          <button
            type="button"
            onClick={dismissImportSummary}
            aria-label="알림 닫기"
            className="shrink-0 text-[12px] font-medium underline-offset-2 hover:underline"
          >
            닫기
          </button>
        </div>
      )}
      <KanbanBoard applications={applications} />
    </>
  );
}
