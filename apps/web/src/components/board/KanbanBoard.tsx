'use client';

import {
  type Announcements,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useMemo, useState } from 'react';
import { ApplicationCardContent } from '@/components/board/ApplicationCardContent';
import { Column } from '@/components/board/Column';
import { STATUS_INFO, STATUS_ORDER } from '@/constants/status';
import { useApplicationStore } from '@/store/applicationStore';
import type { Application, Status } from '@/types/application';
import { getTodayInKorea } from '@/utils/applicationDeadline';
import { getDuplicateApplicationIds } from '@/utils/duplicateDetection';

interface KanbanBoardProps {
  applications: Application[];
  visibleApplications?: Application[];
  onOpen: (applicationId: string) => void; // 카드를 누르면 상세 패널을 연다 (#175)
}

const ARROW_DIRECTION: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

// 키보드로 옮길 때 화살표 한 번에 옆 단계(열) 가운데로 간다 (#204). 기본 동작(25px씩)으로는 열을 넘기 어렵다.
// 열 순서는 STATUS_ORDER. 모바일처럼 가로 스크롤이 생겨도 다음 열의 실제 위치를 쓴다.
const columnCoordinates: KeyboardCoordinateGetter = (event, { context, currentCoordinates }) => {
  const direction = ARROW_DIRECTION[event.code];
  if (!direction) return undefined;
  event.preventDefault();
  const { over, active, droppableRects, collisionRect } = context;
  const currentStatus = (over?.id ?? active?.data.current?.status) as Status | undefined;
  if (!currentStatus || !collisionRect) return currentCoordinates;
  const next = STATUS_ORDER[STATUS_ORDER.indexOf(currentStatus) + direction];
  const rect = next ? droppableRects.get(next) : undefined;
  if (!rect) return currentCoordinates;
  return { x: rect.left + (rect.width - collisionRect.width) / 2, y: rect.top + 48 };
};

// 화면 읽기 프로그램 안내 (dnd-kit 기본은 영어). 카드 이름과 단계 이름으로 말한다.
const INSTRUCTIONS = '카드에서 Space를 누르면 집어요. 화살표로 옆 단계로 옮기고 Space나 Enter로 놓아요. Esc는 취소예요. 집지 않은 카드에서 Enter를 누르면 상세가 열려요.';

function stageLabel(id: unknown): string {
  return STATUS_INFO[id as Status]?.label ?? '';
}

export function KanbanBoard({ applications, visibleApplications = applications, onOpen }: KanbanBoardProps) {
  // ── 상태: 지금 끌고 있는 카드 ──
  const updateStatus = useApplicationStore((state) => state.updateStatus);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | undefined>(undefined);
  const today = getTodayInKorea();

  // ── 끌기 설정: 입력 방식별 시작 조건과 스크린리더 안내 ──
  // 데스크톱: 8px 이상 움직여야 드래그 시작 (클릭과 공존)
  // 모바일: 250ms 이상 눌러야 드래그 시작 (짧은 탭/세로 스크롤과 공존)
  // 키보드: Space로 집고 화살표로 열을 옮긴다 (#204)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: columnCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  );

  const companyOf = (id: unknown) => applications.find((application) => application.id === id)?.company ?? '카드';
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${companyOf(active.id)} 카드를 집었어요. 지금 단계: ${stageLabel(active.data.current?.status)}.`,
    onDragOver: ({ over }) => (over ? `${stageLabel(over.id)} 단계 위예요.` : '단계 밖이에요.'),
    onDragEnd: ({ active, over }) => (over ? `${companyOf(active.id)} 카드를 ${stageLabel(over.id)} 단계에 놓았어요.` : '카드를 제자리에 두었어요.'),
    onDragCancel: ({ active }) => `${companyOf(active.id)} 카드 옮기기를 취소했어요.`,
  };

  // ── 처리 함수: 집기·놓기·취소 ──
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
    if (!over) return;

    const applicationId = active.id as string;
    const newStatus = over.id as Status;
    const application = applications.find((item) => item.id === applicationId);
    if (!application || application.status === newStatus) return;
    updateStatus(applicationId, newStatus);
  };

  const activeApplication = applications.find((application) => application.id === activeId);

  // 크로스플랫폼 중복 지원 여부는 저장하지 않고 목록이 바뀔 때만 다시 계산한다.
  const duplicateIds = useMemo(() => getDuplicateApplicationIds(applications), [applications]);

  return (
    <DndContext
      sensors={sensors}
      accessibility={{ announcements, screenReaderInstructions: { draggable: INSTRUCTIONS } }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={resetActiveDrag}
    >
      {/* ── 7단계 열 ── */}
      {/* 7단계 열. 좁은 화면에서는 열 폭(144px)을 지키고 가로로 넘긴다. 내용 폭 1200(안쪽 1120)에서 일곱 열이 모두 보이는 최소 폭이다.
          relative가 꼭 있어야 한다: 열 제목의 sr-only 건수(절대 위치)가 이 상자를 기준으로 잘려야
          화면 밖 열의 글자가 페이지 폭을 늘리지 않는다(768px에서 문서 폭 1132px로 늘던 문제, #204). */}
      <div className="relative -mx-1 overflow-x-auto px-1 pb-2">
        <div className="grid grid-cols-[repeat(7,minmax(9rem,1fr))] items-start gap-2">
          {STATUS_ORDER.map((status) => (
            <Column
              key={status}
              status={status}
              applications={visibleApplications.filter((application) => application.status === status)}
              duplicateIds={duplicateIds}
              today={today}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>

      {/* ── 끄는 동안 손에 들린 카드 ── */}
      <DragOverlay>
        {activeApplication && (
          <div style={{ width: activeWidth }} className="flex rotate-2 cursor-grabbing flex-col gap-1 rounded-md bg-surface p-3 shadow-lg">
            <ApplicationCardContent application={activeApplication} isDuplicate={duplicateIds.has(activeApplication.id)} today={today} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
