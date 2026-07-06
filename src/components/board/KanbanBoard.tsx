'use client';

import { Application } from '@/types/application';
import { STATUS_ORDER } from '@/constants/status';
import { Column } from '@/components/board/Column';

interface KanbanBoardProps {
  applications: Application[];
}

export function KanbanBoard({ applications }: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-6">
      {STATUS_ORDER.map((status) => {
        const columnApplications = applications.filter((application) => application.status === status);

        return <Column key={status} status={status} applications={columnApplications} />;
      })}
    </div>
  );
}
