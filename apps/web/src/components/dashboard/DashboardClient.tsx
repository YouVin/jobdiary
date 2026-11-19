'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApplicationErrorNotice, ImportSummaryNotice } from '@/components/dashboard/ApplicationNotices';
import { CalendarCard } from '@/components/dashboard/CalendarCard';
import { DiaryHeader } from '@/components/dashboard/DiaryHeader';
import { JourneyCard } from '@/components/dashboard/JourneyCard';
import { RecentCard } from '@/components/dashboard/RecentCard';
import { RouteCard } from '@/components/dashboard/RouteCard';
import { UpcomingCard } from '@/components/dashboard/UpcomingCard';
import { ApplicationPanel } from '@/components/detail/ApplicationPanel';
import { useApplicationsLoader } from '@/hooks/useApplicationsLoader';
import { useExtensionImport } from '@/hooks/useExtensionImport';
import { useStageMove } from '@/hooks/useStageMove';
import { useApplicationStore } from '@/store/applicationStore';
import type { Platform } from '@/types/application';
import { getTodayInKorea } from '@/utils/applicationDeadline';
import {
  getApplicationOverview,
  getMonthCalendar,
  getPlatformShares,
  getRecentApplications,
  getStageSummary,
  getUpcomingEvents,
} from '@/utils/applicationStats';

// 홈(/) 일기장 대시보드 (#158). 칸반·검색·필터는 지원 보드(/board)의 BoardClient가 담당한다.
// 1줄: 오늘의 일기장(요약·가져오기) / 2줄: 전형 여정 | 지원 경로 / 3줄: 일정 타임라인 | 최근 지원 | 지원 달력
export function DashboardClient() {
  const isReady = useApplicationsLoader();
  const applications = useApplicationStore((state) => state.applications);
  const error = useApplicationStore((state) => state.error);
  const { requestImport, isRequesting, isExtensionAvailable, importSummary, lastImportAt, dismissImportSummary } =
    useExtensionImport();
  // 일정·최근 지원 행을 누르면 지원 보드와 같은 상세 패널을 연다 (#175). 삭제되면 패널도 함께 닫힌다.
  const { optimisticApplications, moveStage, moveError } = useStageMove(applications);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedApplication = optimisticApplications.find((application) => application.id === selectedId);

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
      calendar: getMonthCalendar(applications, today),
      platformCounts,
      platformShares,
    };
  }, [applications]);

  if (!isReady) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="지원 현황을 불러오는 중">
        <div className="min-h-50 animate-pulse rounded-card bg-column" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="min-h-60 animate-pulse rounded-card bg-column lg:col-span-7" />
          <div className="min-h-60 animate-pulse rounded-card bg-column lg:col-span-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">대시보드</h1>
      <ApplicationErrorNotice error={error} />
      <ImportSummaryNotice summary={importSummary} onDismiss={dismissImportSummary} />

      <DiaryHeader
        today={stats.today}
        overview={stats.overview}
        stage={stats.stage}
        nextEvent={stats.upcoming[0]}
        platformCounts={stats.platformCounts}
        lastImportAt={lastImportAt}
        onImport={requestImport}
        isRequesting={isRequesting}
        isExtensionAvailable={isExtensionAvailable}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <JourneyCard stage={stats.stage} />
        </div>
        <div className="min-w-0 lg:col-span-5">
          <RouteCard shares={stats.platformShares} total={stats.overview.total} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0">
          <UpcomingCard events={stats.upcoming} onSelect={setSelectedId} />
        </div>
        <div className="min-w-0">
          <RecentCard applications={stats.recent} onSelect={setSelectedId} />
        </div>
        <div className="min-w-0 md:col-span-2 lg:col-span-1">
          <CalendarCard calendar={stats.calendar} />
        </div>
      </div>

      {selectedApplication && (
        <ApplicationPanel
          key={selectedApplication.id}
          application={selectedApplication}
          onClose={() => setSelectedId(null)}
          onMove={moveStage}
          moveError={moveError}
        />
      )}
    </div>
  );
}
