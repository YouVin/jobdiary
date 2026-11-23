'use client';

import { useDraggable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { ApplicationCardContent } from '@/components/board/ApplicationCardContent';
import { STATUS_INFO } from '@/constants/status';
import type { Application } from '@/types/application';

interface ApplicationCardProps {
  application: Application;
  isDuplicate?: boolean;
  today: string;
  onOpen: (applicationId: string) => void;
}

// 칸반 작은 카드 (#204). 누르면(Enter) 상세 패널, 끌거나 Space로 집으면 단계 옮기기.
// dnd-kit이 주는 role=button·tabIndex·안내 연결(aria-describedby)을 그대로 쓰고, 이름은 회사·직무·단계로 준다.
export function ApplicationCard({ application, isDuplicate = false, today, onOpen }: ApplicationCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: application.id,
    data: { status: application.status },
    attributes: { roleDescription: '옮길 수 있는 카드' },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`${application.company}, ${application.position}, ${STATUS_INFO[application.status].label}`}
      onClick={() => onOpen(application.id)}
      onKeyDown={(event) => {
        // Space는 집기(센서), Enter는 상세 열기. 집은 동안의 Enter는 "놓기"라 열지 않는다.
        listeners?.onKeyDown?.(event);
        if (event.key === 'Enter' && !isDragging && !event.defaultPrevented) {
          event.preventDefault();
          onOpen(application.id);
        }
      }}
      className={clsx(
        'flex cursor-pointer touch-manipulation flex-col gap-1 rounded-md bg-surface p-3 transition-shadow duration-fast hover:shadow-sm',
        'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        isDragging && 'opacity-40',
      )}
    >
      <ApplicationCardContent application={application} isDuplicate={isDuplicate} today={today} />
    </div>
  );
}
