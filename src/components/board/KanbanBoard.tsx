'use client';

import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Application, Status } from '@/types/application';
import { STATUS_ORDER } from '@/constants/status';
import { Column } from '@/components/board/Column';
import { useApplicationStore } from '@/store/applicationStore';

interface KanbanBoardProps {
  applications: Application[];
}

export function KanbanBoard({ applications }: KanbanBoardProps) {
  const updateStatus = useApplicationStore((state) => state.updateStatus);

  // 카드 클릭과 드래그가 공존하도록 일정 거리 이상 움직여야 드래그 시작
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const applicationId = active.id as string;
    const newStatus = over.id as Status;

    const application = applications.find((item) => item.id === applicationId);
    if (!application || application.status === newStatus) {
      return;
    }

    updateStatus(applicationId, newStatus);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-6">
        {STATUS_ORDER.map((status) => {
          const columnApplications = applications.filter((application) => application.status === status);

          return <Column key={status} status={status} applications={columnApplications} />;
        })}
      </div>
    </DndContext>
  );
}
