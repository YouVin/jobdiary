'use client';

import { buttonClassName } from '@/components/common/buttonStyles';
import { inputClassName } from '@/components/common/formStyles';
import { PLATFORM_INFO } from '@/constants/platform';
import { DEFAULT_APPLICATION_FILTERS, type ApplicationFilters as Filters } from '@/utils/applicationFilters';
import type { Platform } from '@/types/application';

interface ApplicationFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  visibleCount: number;
  totalCount: number;
}

const platforms = Object.keys(PLATFORM_INFO) as Platform[];

export function ApplicationFilters({ filters, onChange, visibleCount, totalCount }: ApplicationFiltersProps) {
  const hasFilters = filters.query !== '' || filters.platform !== 'all' || filters.hideClosed;

  return (
    <section aria-label="지원 내역 검색 및 필터" className="mb-4 rounded-section border border-card-border bg-card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-label text-text-secondary">
          회사명·공고명 검색
          <input
            type="search"
            value={filters.query}
            onChange={(event) => onChange({ ...filters, query: event.target.value })}
            placeholder="회사명 또는 공고명 입력"
            className={inputClassName}
          />
        </label>
        <label className="flex flex-col gap-1 text-label text-text-secondary">
          플랫폼
          <select
            value={filters.platform}
            onChange={(event) => onChange({ ...filters, platform: event.target.value as Filters['platform'] })}
            className={inputClassName}
          >
            <option value="all">전체 플랫폼</option>
            {platforms.map((platform) => <option key={platform} value={platform}>{PLATFORM_INFO[platform].label}</option>)}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 py-2 text-body text-text-primary">
          <input
            type="checkbox"
            checked={filters.hideClosed}
            onChange={(event) => onChange({ ...filters, hideClosed: event.target.checked })}
            aria-describedby="closed-applications-help"
            className="h-4 w-4 accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
          종료 지원 숨기기
        </label>
        <button
          type="button"
          disabled={!hasFilters}
          onClick={() => onChange({ ...DEFAULT_APPLICATION_FILTERS })}
          className={buttonClassName('secondary')}
        >
          필터 초기화
        </button>
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-label text-text-secondary">
        <p id="closed-applications-help">종료 지원: 합격·탈락·지원취소</p>
        <p role="status" aria-atomic="true">전체 {totalCount}건 중 {visibleCount}건 표시</p>
      </div>
    </section>
  );
}
