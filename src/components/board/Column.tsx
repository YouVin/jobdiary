'use client';

import { Application, Status } from '@/types/application';
import { ColumnHeader } from '@/components/board/ColumnHeader';
import { ApplicationCard } from '@/components/board/ApplicationCard';

interface ColumnProps {
  status: Status;
  applications: Application[];
}

export function Column({ status, applications }: ColumnProps) {
  return (
    <div className="min-h-[120px] rounded-[10px] bg-column p-2">
      <ColumnHeader status={status} count={applications.length} />

      <div className="mt-3 flex flex-col gap-[7px]">
        {applications.map((application) => (
          <ApplicationCard key={application.id} application={application} />
        ))}
      </div>
    </div>
  );
}
