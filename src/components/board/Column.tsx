'use client';

import { clsx } from 'clsx';
import { useDroppable } from '@dnd-kit/core';
import { Application, Status } from '@/types/application';
import { ColumnHeader } from '@/components/board/ColumnHeader';
import { ApplicationCard } from '@/components/board/ApplicationCard';

interface ColumnProps {
  status: Status;
  applications: Application[];
}

export function Column({ status, applications }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'min-h-30 rounded-[10px] border-2 p-2 transition-colors',
        isOver ? 'border-brand bg-brand-tint' : 'border-transparent bg-column',
      )}
    >
      <ColumnHeader status={status} count={applications.length} />

      <div className="mt-3 flex flex-col gap-1.75">
        {applications.map((application) => (
          <ApplicationCard key={application.id} application={application} />
        ))}
      </div>
    </div>
  );
}
