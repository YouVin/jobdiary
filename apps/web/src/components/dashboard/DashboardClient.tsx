'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { ApplicationErrorNotice } from '@/components/dashboard/ApplicationNotices';
import { CalendarCard } from '@/components/dashboard/CalendarCard';
import { GettingStartedCard } from '@/components/dashboard/GettingStartedCard';
import { JourneyCard } from '@/components/dashboard/JourneyCard';
import { RouteCard } from '@/components/dashboard/RouteCard';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { UpcomingCard } from '@/components/dashboard/UpcomingCard';
import { WeeklyCard } from '@/components/dashboard/WeeklyCard';
import { useApplicationsLoader } from '@/hooks/useApplicationsLoader';
import { usePreloadOnIdle } from '@/hooks/usePreloadOnIdle';
import { useStageMove } from '@/hooks/useStageMove';
import { useApplicationStore } from '@/store/applicationStore';
import type { Platform } from '@/types/application';
import { getTodayInKorea } from '@/utils/applicationDeadline';
import {
  getApplicationOverview,
  getPlatformShares,
  getStageSummary,
  getUpcomingEvents,
  getWeeklyApplications,
} from '@/utils/applicationStats';

// 상세 패널(회사 정보·공고 이미지 처리 포함)은 회사를 누를 때만 필요하다. 첫 로드에서 빼고 한가할 때 미리 받는다 (#265).
const loadApplicationPanel = () => import('@/components/detail/ApplicationPanel').then((module) => module.ApplicationPanel);
const ApplicationPanel = dynamic(loadApplicationPanel);

// 첫 화면에서 카드가 위에서부터 차례로 올라온다 (motion-safe에서만, 60ms 간격).
function riseDelay(order: number): React.CSSProperties {
  return { animationDelay: `${order * 60}ms` };
}

// 홈(/) 통계 대시보드 (#203, 캔버스 메인 시안). 칸반·검색·필터는 지원 보드(/board)의 BoardClient가 담당한다.
// 1줄: 요약(문장 h1 + 숫자 4칸) / 2줄: 전형 여정 | 지원 경로 / 3줄: 다가오는 일정 | 주간 지원 | 지원 달력
// 가져오기 버튼·?import=1 자동 가져오기는 헤더와 함께 쓰는 ExtensionImportProvider가 맡는다.
export function DashboardClient() {
  // ── 데이터 ──
  const isReady = useApplicationsLoader();
  usePreloadOnIdle(loadApplicationPanel);
  const applications = useApplicationStore((state) => state.applications);
  const error = useApplicationStore((state) => state.error);
  // 일정 줄과 달력 날짜 목록(#190)의 회사를 누르면 지원 보드와 같은 상세 패널을 연다 (#175). 삭제되면 패널도 함께 닫힌다.
  const { optimisticApplications, moveStage, moveError } = useStageMove(applications);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedApplication = optimisticApplications.find((application) => application.id === selectedId);

  // ── 카드에 보여 줄 숫자 (utils/applicationStats.ts) ──
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
      weekly: getWeeklyApplications(applications, today),
      platformCounts,
      platformShares,
    };
  }, [applications]);

  // ── 불러오는 중: 카드 자리 ──
  if (!isReady) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="지원 현황을 불러오고 있어요">
        <div className="h-60 rounded-xl bg-muted motion-safe:animate-pulse" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-72 rounded-xl bg-muted motion-safe:animate-pulse" />
          <div className="h-72 rounded-xl bg-muted motion-safe:animate-pulse" />
        </div>
      </div>
    );
  }

  // ── 첫 사용: 지원이 하나도 없으면 빈 통계 대신 시작 안내 (#272) ──
  if (!error && applications.length === 0) {
    return <GettingStartedCard />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── 오류 알림 ── */}
      <ApplicationErrorNotice error={error} />

      {/* ── 1줄: 요약(문장 + 숫자 4칸) ── */}
      <SummaryCard
        today={stats.today}
        overview={stats.overview}
        stage={stats.stage}
        nextEvent={stats.upcoming[0]}
        platformCounts={stats.platformCounts}
        style={riseDelay(0)}
      />

      {/* ── 2줄: 전형 여정 | 지원 경로 ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <JourneyCard stage={stats.stage} style={riseDelay(1)} />
        <RouteCard shares={stats.platformShares} total={stats.overview.total} style={riseDelay(2)} />
      </div>

      {/* ── 3줄: 다가오는 일정 | 주간 지원 | 지원 달력 ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <UpcomingCard today={stats.today} events={stats.upcoming} onSelect={setSelectedId} style={riseDelay(3)} />
        <WeeklyCard weeks={stats.weekly} style={riseDelay(4)} />
        <div className="min-w-0 md:col-span-2 lg:col-span-1">
          <CalendarCard today={stats.today} applications={optimisticApplications} onSelect={setSelectedId} style={riseDelay(5)} />
        </div>
      </div>

      {/* ── 상세 패널(오른쪽) ── */}
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
