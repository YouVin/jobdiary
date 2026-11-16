'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApplicationErrorNotice, ImportSummaryNotice } from '@/components/dashboard/ApplicationNotices';
import { ImportCard } from '@/components/dashboard/ImportCard';
import { OverviewCard } from '@/components/dashboard/OverviewCard';
import { RecentCard } from '@/components/dashboard/RecentCard';
import { RouteCard } from '@/components/dashboard/RouteCard';
import { UpcomingCard } from '@/components/dashboard/UpcomingCard';
import { EditApplicationModal } from '@/components/modal/EditApplicationModal';
import { useApplicationsLoader } from '@/hooks/useApplicationsLoader';
import { useExtensionImport } from '@/hooks/useExtensionImport';
import { useApplicationStore } from '@/store/applicationStore';
import type { Platform } from '@/types/application';
import { getTodayInKorea } from '@/utils/applicationDeadline';
import {
  getApplicationOverview,
  getPlatformShares,
  getRecentApplications,
  getStageSummary,
  getUpcomingEvents,
} from '@/utils/applicationStats';
import { formatDateWithWeekday } from '@/utils/format';

// 홈(/) 통계 대시보드. 칸반·검색·필터는 지원 보드(/board)의 BoardClient가 담당한다.
export function DashboardClient() {
  const isReady = useApplicationsLoader();
  const applications = useApplicationStore((state) => state.applications);
  const error = useApplicationStore((state) => state.error);
  const { requestImport, isRequesting, isExtensionAvailable, importSummary, dismissImportSummary } =
    useExtensionImport();
  // 일정·최근 지원 행을 누르면 칸반 카드와 같은 수정 모달을 연다. 삭제되면 모달도 함께 닫힌다.
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingApplication = applications.find((application) => application.id === editingId);

  // 익스텐션이 "취준일기 열기"로 붙인 ?import=1 신호를 감지하면 자동으로 가져오기를 실행한다.
  // 처리 전에 먼저 URL에서 신호를 지워, 새로고침해도 다시 트리거되지 않게 한다(중복 방지).
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('import') !== '1') {
      return;
    }

    url.searchParams.delete('import');
    window.history.replaceState({}, '', url.toString());

    requestImport();
  }, [requestImport]);

  const stats = useMemo(() => {
    const today = getTodayInKorea();
    const platformShares = getPlatformShares(applications);
    const platformCounts = { saramin: 0, jobkorea: 0, wanted: 0, manual: 0 } as Record<Platform, number>;
    for (const { platform, count } of platformShares) platformCounts[platform] = count;
    return {
      today,
      overview: getApplicationOverview(applications, today),
      stage: getStageSummary(applications),
      upcoming: getUpcomingEvents(applications, today),
      recent: getRecentApplications(applications, 4),
      platformCounts,
      platformShares,
    };
  }, [applications]);

  if (!isReady) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12" aria-busy="true" aria-label="지원 현황을 불러오는 중">
        <div className="min-h-60 animate-pulse rounded-card bg-column lg:col-span-7" />
        <div className="min-h-60 animate-pulse rounded-card bg-column lg:col-span-5" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-heading-lg font-semibold text-text-primary">안녕하세요, 오늘도 한 걸음</h1>
        <p className="text-label text-text-secondary tabular-nums">{formatDateWithWeekday(stats.today, true)} 기준</p>
      </div>

      <ApplicationErrorNotice error={error} />
      <ImportSummaryNotice summary={importSummary} onDismiss={dismissImportSummary} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <OverviewCard overview={stats.overview} stage={stats.stage} />
        </div>
        <div className="min-w-0 lg:col-span-5">
          <ImportCard
            platformCounts={stats.platformCounts}
            onImport={requestImport}
            isRequesting={isRequesting}
            isExtensionAvailable={isExtensionAvailable}
          />
        </div>
        <div className="min-w-0 lg:col-span-7">
          <UpcomingCard events={stats.upcoming} onSelect={setEditingId} />
        </div>
        <div className="min-w-0 lg:col-span-5">
          <RecentCard applications={stats.recent} onSelect={setEditingId} />
        </div>
        <div className="min-w-0 lg:col-span-12">
          <RouteCard shares={stats.platformShares} total={stats.overview.total} />
        </div>
      </div>

      {editingApplication && (
        <EditApplicationModal application={editingApplication} isOpen onClose={() => setEditingId(null)} />
      )}
    </div>
  );
}
