import { buttonClassName } from '@/components/common/buttonStyles';
import { Icon } from '@/components/common/Icon';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { PLATFORM_INFO, PLATFORM_STATUS_PAGES } from '@/constants/platform';
import type { Platform } from '@/types/application';

type CollectedPlatform = Exclude<Platform, 'manual'>;

interface ImportCardProps {
  platformCounts: Record<Platform, number>;
  onImport: () => void;
  isRequesting: boolean;
  isExtensionAvailable: boolean;
}

// 익스텐션 platform 토큰(배경/글자)을 그대로 쓴 플랫폼 표시. 클래스는 리터럴로 둔다.
const PLATFORM_ROWS: { platform: CollectedPlatform; mark: string; markClass: string }[] = [
  { platform: 'saramin', mark: 'S', markClass: 'bg-platform-saramin-bg text-platform-saramin-text' },
  { platform: 'jobkorea', mark: 'J', markClass: 'bg-platform-jobkorea-bg text-platform-jobkorea-text' },
  { platform: 'wanted', mark: 'W', markClass: 'bg-platform-wanted-bg text-platform-wanted-text' },
];

export function ImportCard({ platformCounts, onImport, isRequesting, isExtensionAvailable }: ImportCardProps) {
  return (
    <DashboardCard title="지원 기록 업데이트" titleId="import-card-title">
      <ul>
        {PLATFORM_ROWS.map(({ platform, mark, markClass }) => {
          const { label } = PLATFORM_INFO[platform];
          const page = PLATFORM_STATUS_PAGES[platform];
          return (
            <li key={platform} className="flex items-center gap-3 border-b border-card-border py-3 last:border-b-0">
              <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-label font-bold ${markClass}`}>
                {mark}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-card-company text-text-primary">{label}</p>
                <p className="text-caption text-text-secondary tabular-nums">{platformCounts[platform]}건 저장됨</p>
              </div>
              <a
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${label} ${page.label} (새 탭)`}
                className="shrink-0 rounded text-label text-text-secondary underline-offset-2 hover:text-text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {page.label}
              </a>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-caption text-text-secondary">
          {isExtensionAvailable
            ? '사이트에서 익스텐션으로 수집한 지원 내역을 한 번에 가져옵니다.'
            : '크롬 익스텐션을 설치하면 세 사이트의 지원 내역을 한 번에 가져올 수 있어요.'}
        </p>
        <button
          type="button"
          onClick={onImport}
          disabled={!isExtensionAvailable || isRequesting}
          title={isExtensionAvailable ? undefined : '익스텐션이 설치되어 있지 않습니다'}
          className={buttonClassName('secondary')}
        >
          <Icon name="download" className="h-4 w-4" />
          {isRequesting ? '가져오는 중...' : '익스텐션에서 가져오기'}
        </button>
      </div>
    </DashboardCard>
  );
}
