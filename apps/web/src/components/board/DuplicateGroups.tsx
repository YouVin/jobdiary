import { PlatformIcon } from '@/components/badge/PlatformIcon';
import { Icon } from '@/components/common/Icon';
import { Badge, StageDot } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { CompanyAvatar } from '@/components/ui/CompanyRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { StatCell, StatGroup } from '@/components/ui/StatCell';
import { PLATFORM_INFO } from '@/constants/platform';
import type { Application } from '@/types/application';
import type { DuplicateGroup } from '@/utils/duplicateDetection';
import { formatDate } from '@/utils/format';
import { getPostingUrl } from '@/utils/postingUrl';

interface DuplicateGroupsProps {
  groups: DuplicateGroup[];
  totalCount: number; // 전체 지원 수 (실제 지원한 공고 수 계산용)
  onOpen: (applicationId: string) => void;
}

const ICON_LINK_CLASS =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors duration-fast hover:bg-subtle hover:text-text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// 묶음 안의 지원 한 건: 사이트 · 단계 · 지원일 · 공고 열기 · 상세 보기
function DuplicateRow({ application, onOpen }: { application: Application; onOpen: DuplicateGroupsProps['onOpen'] }) {
  const postingUrl = getPostingUrl(application.url);
  const platformLabel = PLATFORM_INFO[application.platform].label;
  const appliedDate = formatDate(application.appliedAt);

  return (
    <li className="flex items-center gap-3 border-t border-line-divider py-2 first:border-t-0">
      <PlatformIcon platform={application.platform} />
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <b className="text-body font-semibold text-text-primary">{platformLabel}</b>
        <StageDot status={application.status} className="text-text-secondary" />
      </span>
      <span className="shrink-0 text-label text-text-secondary tabular-nums">{appliedDate} 지원</span>
      {postingUrl ? (
        <a href={postingUrl} target="_blank" rel="noopener noreferrer" title="공고 열기 (새 탭)" className={ICON_LINK_CLASS}>
          <Icon name="external" className="h-4 w-4" />
          <span className="sr-only">{`${application.company} ${platformLabel} 공고 열기 (새 탭에서 열림)`}</span>
        </a>
      ) : (
        <span className="h-9 w-9 shrink-0" aria-hidden="true" />
      )}
      <IconButton label={`${application.company} ${platformLabel} ${appliedDate} 지원 상세 보기`} icon="pencil" size="sm" onClick={() => onOpen(application.id)} />
    </li>
  );
}

// 지원 보드 "중복" 보기 (#186, #204 캔버스 중복 시안). 숫자 3칸 → 묶음별 목록 → 세는 방법 안내.
// 같은 회사·공고를 여러 사이트에서 지원한 건을 묶는다. 묶음 기준은 보드 카드의 "중복" 뱃지와 같다(getDuplicateGroups).
export function DuplicateGroups({ groups, totalCount, onOpen }: DuplicateGroupsProps) {
  const overlapping = groups.reduce((sum, group) => sum + group.applications.length, 0);
  const actualPostings = totalCount - overlapping + groups.length;

  return (
    <>
      {/* ── 숫자 3칸: 묶음·겹친 지원·실제 공고 ── */}
      <Card aria-label="중복 요약">
        <StatGroup label="중복 요약 숫자">
          <StatCell label="중복 묶음" value={groups.length} unit="개" />
          <StatCell label="겹친 지원" value={overlapping} unit="건" />
          <StatCell label="실제 지원한 공고" value={actualPostings} unit="개" />
        </StatGroup>
      </Card>

      {/* ── 묶음 목록: 회사·공고 → 사이트별 지원 줄 ── */}
      <Card aria-labelledby="duplicate-title" gap="none">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pb-2">
          <CardHeader title="사이트 간 중복 지원" titleId="duplicate-title" />
          <span className="text-label text-text-secondary">회사명과 공고명이 같은 지원을 묶었어요</span>
        </div>
        {groups.length ? (
          // id는 순번으로 만든다. 묶음 key에는 공백·따옴표가 있어 aria-labelledby 목록에서 여러 id로 쪼개진다.
          groups.map((group, index) => (
            <article key={group.key} aria-labelledby={`duplicate-group-${index}`} className="flex flex-col gap-1 border-t border-line-divider pt-4 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <CompanyAvatar company={group.company} platform="manual" />
                  <div className="min-w-0">
                    <h3 id={`duplicate-group-${index}`} className="truncate text-body font-semibold text-text-primary">
                      {group.company}
                    </h3>
                    <p className="truncate text-label text-text-secondary">{group.position}</p>
                  </div>
                </div>
                <Badge tone="danger">
                  {group.platforms.length}개 사이트에서 {group.applications.length}건
                </Badge>
              </div>
              <ul className="pl-11">
                {group.applications.map((application) => (
                  <DuplicateRow key={application.id} application={application} onOpen={onOpen} />
                ))}
              </ul>
            </article>
          ))
        ) : (
          <EmptyState icon="check" title="사이트 간 중복 지원이 없어요" description="같은 공고를 여러 사이트에서 지원하면 여기에 모아 보여드려요" />
        )}
      </Card>

      {/* ── 숫자 세는 방법 안내 ── */}
      <p className="px-2 text-label text-text-secondary">
        같은 공고를 여러 사이트에서 지원하면 통계에서는 각각 1건으로 세요. 위 &quot;실제 지원한 공고&quot;는 묶음을 1개로 센 숫자예요.
      </p>
    </>
  );
}
