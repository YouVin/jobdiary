import { clsx } from 'clsx';
import { PlatformBadge } from '@/components/badge/PlatformBadge';
import { Icon } from '@/components/common/Icon';
import { PLATFORM_INFO } from '@/constants/platform';
import { STATUS_DOT_CLASS, STATUS_INFO } from '@/constants/status';
import type { Application } from '@/types/application';
import type { DuplicateGroup } from '@/utils/duplicateDetection';
import { formatDate } from '@/utils/format';
import { getPostingUrl } from '@/utils/postingUrl';

interface DuplicateGroupsProps {
  groups: DuplicateGroup[];
  onOpen: (applicationId: string) => void;
}

const ICON_BUTTON_CLASS =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-text-muted hover:bg-column hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand';

// 묶음 안의 지원 한 건: 사이트 · 단계 · 지원일 · 공고 열기 · 상세 보기
function DuplicateRow({ application, onOpen }: { application: Application; onOpen: DuplicateGroupsProps['onOpen'] }) {
  const postingUrl = getPostingUrl(application.url);
  const platformLabel = PLATFORM_INFO[application.platform].label;
  const appliedDate = formatDate(application.appliedAt);

  return (
    <li className="flex items-center gap-3 py-2">
      <PlatformBadge platform={application.platform} />
      <span className="flex min-w-0 flex-1 items-center gap-2 text-small text-text-secondary">
        <span className={clsx('h-2 w-2 shrink-0 rounded-full', STATUS_DOT_CLASS[application.status])} aria-hidden="true" />
        <span className="truncate">{STATUS_INFO[application.status].label}</span>
      </span>
      <span className="shrink-0 text-caption text-text-muted tabular-nums">{appliedDate} 지원</span>
      {postingUrl ? (
        <a
          href={postingUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${application.company} ${platformLabel} 공고 열기 (새 탭)`}
          title="공고 열기 (새 탭)"
          className={ICON_BUTTON_CLASS}
        >
          <Icon name="external" className="h-4 w-4" />
        </a>
      ) : (
        <span className="h-8 w-8 shrink-0" aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={() => onOpen(application.id)}
        aria-label={`${application.company} ${platformLabel} ${appliedDate} 지원 상세 보기`}
        title="상세 보기"
        className={ICON_BUTTON_CLASS}
      >
        <Icon name="pencil" className="h-4 w-4" />
      </button>
    </li>
  );
}

// 지원보드 "중복" 보기 (#186). 같은 회사·공고를 여러 사이트에서 지원한 건을 묶음별로 보여준다.
// 묶음 기준은 보드 카드의 "중복 지원" 배지와 같다(getDuplicateGroups).
export function DuplicateGroups({ groups, onOpen }: DuplicateGroupsProps) {
  return (
    <section aria-labelledby="duplicate-title" className="mb-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="duplicate-title" className="flex items-baseline gap-2 text-heading-md font-semibold text-text-primary">
          사이트 간 중복 지원
          <span className="text-small font-medium text-text-muted tabular-nums">{groups.length}</span>
        </h2>
        <p className="text-caption text-text-muted">회사명과 공고명이 같은 지원을 묶었어요</p>
      </div>

      {groups.length ? (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <li key={group.key}>
              <article aria-label={`${group.company} ${group.position}`} className="h-full rounded-card border border-card-border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-body font-semibold text-text-primary">{group.company}</h3>
                    <p className="truncate text-caption text-text-muted">{group.position}</p>
                  </div>
                  <span className="shrink-0 rounded bg-status-rejected/10 px-2 py-1 text-caption font-medium text-status-rejected-text">
                    {group.platforms.length}개 사이트 · {group.applications.length}건
                  </span>
                </div>
                <ul className="mt-3 divide-y divide-card-border border-t border-card-border">
                  {group.applications.map((application) => (
                    <DuplicateRow key={application.id} application={application} onOpen={onOpen} />
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-card border border-card-border bg-card p-6 text-small text-text-secondary">
          사이트 간 중복 지원이 없어요. 같은 공고를 여러 사이트에서 지원하면 여기에 모아 보여드려요.
        </p>
      )}
    </section>
  );
}
