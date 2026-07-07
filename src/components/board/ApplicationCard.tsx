'use client';

import { useState } from 'react';
import { Application } from '@/types/application';
import { PlatformBadge } from '@/components/badge/PlatformBadge';
import { EditApplicationModal } from '@/components/modal/EditApplicationModal';
import { formatDate } from '@/utils/format';

interface ApplicationCardProps {
  application: Application;
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { company, position, platform, appliedAt, diary, interviewDate } = application;
  const hasDiary = diary !== undefined && diary.length > 0;

  // Enter/Space 키로도 클릭과 동일하게 수정 모달을 열 수 있도록 지원
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsEditOpen(true);
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsEditOpen(true)}
        onKeyDown={handleKeyDown}
        className="cursor-pointer rounded-lg border-[0.5px] border-card-border bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <p className="text-[13px] font-medium text-text-primary">{company}</p>
        <p className="mt-0.5 text-[11px] text-text-secondary">{position}</p>

        <div className="mt-2 flex items-center justify-between">
          <PlatformBadge platform={platform} />
          <span className="text-[11px] text-text-muted">{formatDate(appliedAt)}</span>
        </div>

        {hasDiary && (
          <div className="mt-2 inline-flex items-center gap-1 rounded bg-brand-tint px-1.5 py-px text-[11px] font-medium text-brand-text">
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            일기 {diary!.length}
          </div>
        )}

        {interviewDate && (
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-brand">
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4" />
              <path d="M8 2v4" />
              <path d="M3 10h18" />
            </svg>
            {formatDate(interviewDate)}
          </div>
        )}
      </div>

      <EditApplicationModal
        application={application}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </>
  );
}
