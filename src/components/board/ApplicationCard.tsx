'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { useDraggable } from '@dnd-kit/core';
import { Application } from '@/types/application';
import { ApplicationCardContent } from '@/components/board/ApplicationCardContent';
import { EditApplicationModal } from '@/components/modal/EditApplicationModal';

interface ApplicationCardProps {
  application: Application;
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: application.id });

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
        ref={setNodeRef}
        onClick={() => setIsEditOpen(true)}
        onKeyDown={handleKeyDown}
        {...attributes}
        {...listeners}
        className={clsx(
          'touch-manipulation cursor-pointer rounded-lg border-[0.5px] border-card-border bg-white p-2.5 shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
          isDragging && 'opacity-40',
        )}
      >
        <ApplicationCardContent application={application} />
      </div>

      <EditApplicationModal
        application={application}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </>
  );
}
