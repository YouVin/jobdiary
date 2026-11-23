'use client';

import { clsx } from 'clsx';
import { useState } from 'react';
import { PlatformIcon } from '@/components/badge/PlatformIcon';
import { DonutChart, WANTED_GRADIENT_STROKE } from '@/components/charts/DonutChart';
import { BoardLink } from '@/components/dashboard/BoardLink';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { PLATFORM_INFO } from '@/constants/platform';
import type { Platform } from '@/types/application';
import type { PlatformShare } from '@/utils/applicationStats';

interface RouteCardProps {
  shares: PlatformShare[];
  total: number;
}

// 색은 플랫폼에 고정한다(순위가 바뀌어도 색이 따라 바뀌지 않음). 사이트 공식 아이콘의 색이며(#193), 원티드는 그라데이션이다.
// 클래스는 리터럴로 둔다.
const PLATFORM_STROKE: Record<Platform, string> = {
  saramin: 'stroke-platform-saramin-chart',
  jobkorea: 'stroke-platform-jobkorea-chart',
  wanted: WANTED_GRADIENT_STROKE,
  manual: 'stroke-platform-manual-chart',
};

function formatShare(share: number): string {
  return `${Math.round(share * 1000) / 10}%`;
}

export function RouteCard({ shares, total }: RouteCardProps) {
  // 도넛 조각이나 목록 행에 마우스를 올리거나 행에 포커스하면 같은 경로를 함께 강조한다.
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const segments = shares.map(({ platform, count }) => ({
    key: platform,
    label: PLATFORM_INFO[platform].label,
    value: count,
    strokeClass: PLATFORM_STROKE[platform],
  }));
  const chartLabel = `지원 경로별 건수: ${shares.map(({ platform, count }) => `${PLATFORM_INFO[platform].label} ${count}건`).join(', ')}`;

  return (
    <DashboardCard title="지원 경로별 비율" titleId="route-card-title" action={<BoardLink label="지원보드에서 보기" />}>
      <div className="flex flex-col items-center gap-6 md:flex-row md:gap-8">
        <DonutChart segments={segments} activeKey={activeKey} onActiveChange={setActiveKey} label={chartLabel}>
          <span className="text-legacy-caption text-text-secondary">전체 지원</span>
          <span className="text-heading-xl text-text-primary tabular-nums">{total}</span>
          <span className="text-legacy-caption text-text-secondary">건</span>
        </DonutChart>

        <ul className="flex w-full min-w-0 flex-1 flex-col">
          {shares.map(({ platform, count, share }) => {
            const label = PLATFORM_INFO[platform].label;
            return (
              <li
                key={platform}
                tabIndex={0}
                aria-label={`${label} ${count}건, ${formatShare(share)}`}
                onMouseEnter={() => setActiveKey(platform)}
                onMouseLeave={() => setActiveKey(null)}
                onFocus={() => setActiveKey(platform)}
                onBlur={() => setActiveKey(null)}
                className={clsx(
                  'flex items-center gap-3 rounded-sm border-b border-card-border px-2 py-3 last:border-b-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                  activeKey === platform && 'bg-column',
                )}
              >
                <PlatformIcon platform={platform} />
                <span className="min-w-0 flex-1 truncate text-card-company text-text-primary">{label}</span>
                <span className="text-legacy-label font-semibold text-text-primary tabular-nums">{count}건</span>
                <span className="w-12 text-right text-legacy-label text-text-secondary tabular-nums">{formatShare(share)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </DashboardCard>
  );
}
