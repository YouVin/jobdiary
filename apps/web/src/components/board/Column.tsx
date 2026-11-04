'use client';

import { useDroppable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { ApplicationCard } from '@/components/board/ApplicationCard';
import { ColumnHeader } from '@/components/board/ColumnHeader';
import { Application, Status } from '@/types/application';

interface ColumnProps {
  status: Status;
  applications: Application[];
  duplicateIds: Set<string>;
}

export function Column({ status, applications, duplicateIds }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'min-h-30 rounded-section border-2 p-2 transition-colors',
        isOver ? 'border-brand bg-brand-tint' : 'border-transparent bg-column',
      )}
    >
      <ColumnHeader status={status} count={applications.length} />

      <div className="mt-3 flex flex-col gap-2">
        {applications.map((application) => (
          <ApplicationCard key={application.id} application={application} isDuplicate={duplicateIds.has(application.id)} />
        ))}
      </div>
    </div>
  );
}
