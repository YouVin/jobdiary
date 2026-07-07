'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Application, Status } from '@/types/application';
import { STATUS_ORDER } from '@/constants/status';
import { Column } from '@/components/board/Column';
import { ApplicationCardContent } from '@/components/board/ApplicationCardContent';
import { useApplicationStore } from '@/store/applicationStore';

interface KanbanBoardProps {
  applications: Application[];
}

export function KanbanBoard({ applications }: KanbanBoardProps) {
  const updateStatus = useApplicationStore((state) => state.updateStatus);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | undefined>(undefined);

  // 데스크톱: 8px 이상 움직여야 드래그 시작 (클릭과 공존)
  // 모바일: 250ms 이상 눌러야 드래그 시작 (짧은 탭/세로 스크롤과 공존)
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveWidth(event.active.rect.current.initial?.width);
  };

  const resetActiveDrag = () => {
    setActiveId(null);
    setActiveWidth(undefined);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    resetActiveDrag();

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

  const activeApplication = applications.find((application) => application.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={resetActiveDrag}
    >
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-6">
        {STATUS_ORDER.map((status) => {
          const columnApplications = applications.filter((application) => application.status === status);

          return <Column key={status} status={status} applications={columnApplications} />;
        })}
      </div>

      <DragOverlay>
        {activeApplication && (
          <div
            style={{ width: activeWidth }}
            className="rotate-2 cursor-grabbing rounded-lg border-[0.5px] border-card-border bg-white p-2.5 shadow-xl"
          >
            <ApplicationCardContent application={activeApplication} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
