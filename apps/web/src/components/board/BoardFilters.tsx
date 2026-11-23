'use client';

import { Card } from '@/components/ui/Card';
import { ChipGroup, FilterChip } from '@/components/ui/FilterChip';
import { SearchInput } from '@/components/ui/TextField';
import { PLATFORM_INFO } from '@/constants/platform';
import type { Application, Platform } from '@/types/application';
import { DEFAULT_APPLICATION_FILTERS, type ApplicationFilters } from '@/utils/applicationFilters';

interface BoardFiltersProps {
  applications: Application[]; // 칩 옆 숫자는 전체 기준
  filters: ApplicationFilters;
  onChange: (filters: ApplicationFilters) => void;
  visibleCount: number;
}

const PLATFORMS: Platform[] = ['jobkorea', 'saramin', 'wanted', 'manual'];

// 보드 보기 검색·거르기 (#204, 캔버스 보드 시안). 회사·직무 검색 + 지원 경로 칩 + 끝난 지원 숨기기.
// 결과 건수는 알림 영역으로 알려 검색할 때마다 스크린리더가 읽는다.
export function BoardFilters({ applications, filters, onChange, visibleCount }: BoardFiltersProps) {
  const counts: Record<Platform, number> = { saramin: 0, jobkorea: 0, wanted: 0, manual: 0 };
  for (const application of applications) counts[application.platform] += 1;
  const hasFilters = filters.query !== '' || filters.platform !== 'all' || filters.hideClosed;

  return (
    <Card aria-label="검색과 거르기" padding="sm" gap="none">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <SearchInput
          label="회사나 직무 검색"
          placeholder="회사나 직무 검색"
          value={filters.query}
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
          className="min-w-0 flex-1 basis-64"
        />
        <ChipGroup label="지원 경로">
          <FilterChip isSelected={filters.platform === 'all'} count={applications.length} onClick={() => onChange({ ...filters, platform: 'all' })}>
            전체
          </FilterChip>
          {PLATFORMS.map((platform) => (
            <FilterChip
              key={platform}
              isSelected={filters.platform === platform}
              count={counts[platform]}
              onClick={() => onChange({ ...filters, platform: filters.platform === platform ? 'all' : platform })}
            >
              {PLATFORM_INFO[platform].label}
            </FilterChip>
          ))}
        </ChipGroup>
        <FilterChip isSelected={filters.hideClosed} onClick={() => onChange({ ...filters, hideClosed: !filters.hideClosed })} title="합격·탈락·지원 취소를 숨겨요">
          끝난 지원 숨기기
        </FilterChip>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-label text-text-secondary">
        <p role="status" aria-atomic="true" className="tabular-nums">
          {hasFilters ? `${applications.length}건 중 ${visibleCount}건을 보여드려요` : `전체 ${applications.length}건`}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_APPLICATION_FILTERS })}
            className="cursor-pointer rounded-xs font-semibold text-text-brand hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            거르기 풀기
          </button>
        )}
      </div>
    </Card>
  );
}
