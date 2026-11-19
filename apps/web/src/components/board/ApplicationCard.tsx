'use client';

import { useDraggable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { ApplicationCardContent } from '@/components/board/ApplicationCardContent';
import { Application } from '@/types/application';

interface ApplicationCardProps {
  application: Application;
  isDuplicate?: boolean;
  onOpen: (applicationId: string) => void;
}

export function ApplicationCard({ application, isDuplicate = false, onOpen }: ApplicationCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: application.id });

  // Enter/Space 키로도 클릭과 동일하게 상세 패널을 열 수 있도록 지원
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(application.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      onClick={() => onOpen(application.id)}
      onKeyDown={handleKeyDown}
      {...attributes}
      {...listeners}
      className={clsx(
        'touch-manipulation cursor-pointer rounded-lg border border-card-border bg-card p-3 shadow-card transition hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        isDragging && 'opacity-40',
      )}
    >
      <ApplicationCardContent application={application} isDuplicate={isDuplicate} />
    </div>
  );
}
