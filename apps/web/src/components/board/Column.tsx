'use client';

import { useDroppable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { useState } from 'react';
import { ApplicationCard } from '@/components/board/ApplicationCard';
import { STAGE_DOT_CLASS } from '@/components/ui/Badge';
import { STATUS_INFO } from '@/constants/status';
import type { Application, Status } from '@/types/application';

interface ColumnProps {
  status: Status;
  applications: Application[];
  duplicateIds: Set<string>;
  today: string;
  onOpen: (applicationId: string) => void;
  limit?: number;
}

// 칸반 한 열 (#204, 캔버스 보드 시안). 회색 판(muted) 위 흰 카드. 처음 limit장만 보이고 "N건 더 보기"로 펼친다.
// 카드를 끌어 올리면 파란 테두리와 selected 바탕으로 놓을 자리를 알린다.
export function Column({ status, applications, duplicateIds, today, onOpen, limit = 5 }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [isExpanded, setIsExpanded] = useState(false);
  const label = STATUS_INFO[status].label;
  const visible = isExpanded ? applications : applications.slice(0, limit);
  const hiddenCount = applications.length - visible.length;
  const titleId = `kanban-${status}`;

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={titleId}
      className={clsx(
        'flex min-h-60 flex-col gap-2 rounded-lg p-2 transition-colors duration-fast',
        isOver ? 'bg-selected ring-2 ring-action-primary ring-inset' : 'bg-muted',
      )}
    >
      <div className="flex items-center gap-2 p-1">
        <span aria-hidden="true" className={clsx('h-2 w-2 shrink-0 rounded-xs', STAGE_DOT_CLASS[status])} />
        <h2 id={titleId} className="text-label font-semibold text-text-primary">
          {label}
          <span className="sr-only">, {applications.length}건</span>
        </h2>
        <span aria-hidden="true" className="ml-auto text-label font-semibold text-text-secondary tabular-nums">
          {applications.length}
        </span>
      </div>

      {visible.map((application) => (
        <ApplicationCard key={application.id} application={application} isDuplicate={duplicateIds.has(application.id)} today={today} onOpen={onOpen} />
      ))}

      {applications.length === 0 && (
        <p className="rounded-md border border-dashed border-line-input px-2 py-5 text-center text-label text-text-secondary">여기로 끌어 놓기</p>
      )}

      {(hiddenCount > 0 || isExpanded) && applications.length > limit && (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((value) => !value)}
          className="cursor-pointer self-start rounded-xs p-1 text-label font-semibold text-text-brand hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {isExpanded ? '접기' : `${hiddenCount}건 더 보기`}
        </button>
      )}
    </section>
  );
}
