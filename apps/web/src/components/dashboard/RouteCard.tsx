'use client';

import { clsx } from 'clsx';
import { useState } from 'react';
import { PlatformIcon } from '@/components/badge/PlatformIcon';
import { DonutChart } from '@/components/charts/DonutChart';
import { Icon } from '@/components/common/Icon';
import { Card, CardHeader, CardSummary } from '@/components/ui/Card';
import { PLATFORM_INFO } from '@/constants/platform';
import type { PlatformShare } from '@/utils/applicationStats';

interface RouteCardProps {
  shares: PlatformShare[]; // 건수 많은 순
  total: number;
  style?: React.CSSProperties;
}

// 순위 색 (#203 디자인 시스템): 1위 chart-1, 2위 chart-2, 3위 chart-3, 나머지 chart-rest. 리터럴로 둔다.
const RANK_STROKE = ['stroke-chart-1', 'stroke-chart-2', 'stroke-chart-3', 'stroke-chart-rest'];
const RANK_FILL = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-rest'];

function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

// "사람인으로"·"잡코리아로": 받침이 있으면(ㄹ 받침 제외) 으로, 없으면 로.
function withRo(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}로`;
  const final = code % 28;
  return final === 0 || final === 8 ? `${word}로` : `${word}으로`;
}

// 지원 경로 (#203): 한 줄 요약 → 도넛(가운데 1위 비율) + 사이트별 목록. 목록 줄에 마우스를 올리면 같은 조각을 강조한다.
export function RouteCard({ shares, total, style }: RouteCardProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const top = shares[0];
  const hasData = total > 0 && top && top.count > 0;
  const segments = shares.map(({ platform, count }, index) => ({
    key: platform,
    label: PLATFORM_INFO[platform].label,
    value: count,
    strokeClass: RANK_STROKE[Math.min(index, 3)],
  }));
  const chartLabel = `지원 경로 비율: ${shares.map(({ platform, share }) => `${PLATFORM_INFO[platform].label} ${percent(share)}`).join(', ')}`;

  return (
    <Card aria-labelledby="route-title" className="h-full motion-safe:animate-rise" style={style}>
      <CardHeader title="지원 경로" titleId="route-title" meta={`전체 ${total}건`} />
      <CardSummary>{hasData ? `${withRo(PLATFORM_INFO[top.platform].label)} 가장 많이 지원했어요` : '아직 지원 경로가 없어요'}</CardSummary>
      <div className="flex flex-wrap items-center gap-6">
        <DonutChart segments={segments} activeKey={activeKey} onActiveChange={setActiveKey} label={chartLabel}>
          {hasData && (
            <>
              <span className="text-title-1 text-text-primary tabular-nums">{percent(top.share)}</span>
              <span className="text-caption font-normal text-text-secondary">{PLATFORM_INFO[top.platform].label}</span>
            </>
          )}
        </DonutChart>

        <ul className="flex min-w-0 flex-1 basis-56 flex-col">
          {shares.map(({ platform, count, share }, index) => {
            const label = PLATFORM_INFO[platform].label;
            return (
              <li
                key={platform}
                onMouseEnter={() => setActiveKey(platform)}
                onMouseLeave={() => setActiveKey(null)}
                className={clsx(
                  'grid grid-cols-[1.75rem_minmax(0,1fr)_auto_2.75rem] items-center gap-3 rounded-sm py-2 transition-colors duration-fast',
                  activeKey === platform && 'bg-subtle',
                )}
              >
                {platform === 'manual' ? (
                  <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-sm bg-subtle text-text-secondary">
                    <Icon name="pencil" className="h-4 w-4" />
                  </span>
                ) : (
                  <PlatformIcon platform={platform} />
                )}
                <span className="flex min-w-0 items-center gap-2 text-body font-semibold text-text-primary">
                  <span aria-hidden="true" className={clsx('h-2 w-2 shrink-0 rounded-xs', RANK_FILL[Math.min(index, 3)])} />
                  <span className="truncate">{label}</span>
                </span>
                <b className={clsx('text-body font-semibold tabular-nums', count === 0 ? 'text-text-secondary' : 'text-text-primary')}>{count}건</b>
                <span className="text-right text-label text-text-secondary tabular-nums">{percent(share)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
