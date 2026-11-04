import { PlatformBadge } from '@/components/badge/PlatformBadge';
import { Icon } from '@/components/common/Icon';
import { Application } from '@/types/application';
import { formatDate } from '@/utils/format';

interface ApplicationCardContentProps {
  application: Application;
  isDuplicate?: boolean;
}

export function ApplicationCardContent({ application, isDuplicate = false }: ApplicationCardContentProps) {
  const { company, position, platform, appliedAt, diary, interviewDate, deadlineAt, statusSource } = application;
  const hasDiary = diary !== undefined && diary.length > 0;

  return (
    <>
      <p className="text-card-company text-text-primary">{company}</p>
      <p className="mt-1 text-caption text-text-secondary">{position}</p>

      <div className="mt-2 flex items-center justify-between">
        <PlatformBadge platform={platform} />
        <span className="text-caption text-text-muted">{formatDate(appliedAt)}</span>
      </div>

      {isDuplicate && (
        <div className="mt-2 inline-flex items-center gap-1 rounded bg-status-rejected/10 px-2 py-1 text-caption font-medium text-status-rejected">
          <Icon name="warning" className="h-3 w-3" />
          중복 지원
        </div>
      )}

      {hasDiary && (
        <div className="mt-2 inline-flex items-center gap-1 rounded bg-brand-tint px-2 py-1 text-caption font-medium text-brand-text">
          <Icon name="pencil" className="h-3 w-3" />
          일기 {diary!.length}
        </div>
      )}

      {interviewDate && (
        <div className="mt-2 flex items-center gap-1 text-caption font-medium text-brand">
          <Icon name="calendar" className="h-3 w-3" />
          {formatDate(interviewDate)}
        </div>
      )}

      {deadlineAt && (
        <p className="mt-2 text-caption text-text-muted">공고 마감 {formatDate(deadlineAt)}</p>
      )}
      {statusSource === 'deadline' && (
        <p className="mt-1 text-caption text-status-rejected">마감일 기준 자동 탈락</p>
      )}
    </>
  );
}
