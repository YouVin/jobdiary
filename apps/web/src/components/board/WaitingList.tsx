'use client';

import { clsx } from 'clsx';
import { useState, ViewTransition } from 'react';
import { Icon } from '@/components/common/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CompanyAvatar } from '@/components/ui/CompanyRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { StageTrack } from '@/components/ui/StageTrack';
import { STATUS_INFO } from '@/constants/status';
import type { Status } from '@/types/application';
import { getPostingUrl } from '@/utils/postingUrl';
import type { WaitingItem } from '@/utils/waitingList';
import { ACTIVE_STATUSES } from '@/utils/weekTimeline';

interface WaitingListProps {
  items: WaitingItem[];
  scheduledCount: number;
  stage: Status | null;
  moveError: string | null;
  onClearStage: () => void;
  onMove: (applicationId: string, status: Status) => void;
  onOpen: (applicationId: string) => void;
  limit?: number;
}

// 넓은 화면 열: 회사 | 단계 트랙 | 다음 일정 | 지원 후
const ROW_GRID = 'lg:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_7.5rem_5.5rem] lg:gap-x-6';
const ROW_PADDING = 'px-5 sm:px-6';

function shortDate(date: string): string {
  return `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}`;
}

function WaitingRow({ item, onMove, onOpen }: { item: WaitingItem; onMove: WaitingListProps['onMove']; onOpen: WaitingListProps['onOpen'] }) {
  const { application, stageIndex, waitDays, isStale, nextEvent } = item;
  const postingUrl = getPostingUrl(application.url);
  let waitNote = '지원 후';
  if (isStale) waitNote = '소식 없음';
  else if (application.status === 'applied') waitNote = '결과 대기';

  return (
    <li className={clsx('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-t border-line-divider py-3 transition-colors duration-fast hover:bg-subtle', ROW_PADDING, ROW_GRID)}>
      {/* ── 1칸: 회사(공고 링크)·직무·상세 버튼 ── */}
      {/* 회사 이름은 공고를 새 탭으로 연다(#185). 상세 패널(기록·정보 수정)은 오른쪽 연필 버튼으로 연다. */}
      <div className="flex min-w-0 items-center gap-3">
        <CompanyAvatar company={application.company} platform={application.platform} />
        <span className="min-w-0 flex-1">
          {postingUrl ? (
            <a
              href={postingUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="공고 열기 (새 탭)"
              className="group flex min-w-0 items-center gap-1 rounded-xs text-body font-semibold text-text-primary underline-offset-2 hover:text-text-brand hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <span className="truncate">{application.company}</span>
              <Icon name="external" className="h-4 w-4 shrink-0 text-text-secondary group-hover:text-text-brand" />
              <span className="sr-only"> 공고 열기 (새 탭에서 열림)</span>
            </a>
          ) : (
            <b className="block truncate text-body font-semibold text-text-primary">{application.company}</b>
          )}
          <span className="block truncate text-label text-text-secondary">{application.position}</span>
        </span>
        <IconButton label={`${application.company} 상세 보기`} icon="pencil" size="sm" onClick={() => onOpen(application.id)} />
      </div>

      {/* ── 2칸: 단계 트랙 ── */}
      <div className="col-span-2 row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1">
        {/* 좁은 화면에는 열 머리가 없어 트랙 아래에 단계 이름을 둔다. */}
        <StageTrack company={application.company} stageIndex={stageIndex} onMove={(status) => onMove(application.id, status)} labelsClassName="lg:hidden" />
      </div>

      {/* ── 3칸: 다음 일정 ── */}
      <p className={clsx('col-span-2 row-start-3 text-label text-text-secondary tabular-nums lg:col-span-1 lg:col-start-3 lg:row-start-1', !nextEvent && 'max-lg:hidden')}>
        {nextEvent ? (
          <>
            <b className="mr-1 font-semibold text-text-primary">
              {nextEvent.kind === 'interview' ? '면접' : '마감'} {nextEvent.daysLeft === 0 ? 'D-DAY' : `D-${nextEvent.daysLeft}`}
            </b>
            {shortDate(nextEvent.date)}
          </>
        ) : (
          '일정 없음'
        )}
      </p>

      {/* ── 4칸: 지원 후 며칠째 ── */}
      <p className={clsx('col-start-2 row-start-1 text-right tabular-nums lg:col-start-4', isStale ? 'text-danger-text' : 'text-text-primary')}>
        <b className="block text-body font-semibold">{waitDays}일째</b>
        <span className={clsx('block text-caption font-normal', isStale ? 'text-danger-text' : 'text-text-secondary')}>{waitNote}</span>
      </p>
    </li>
  );
}

// 결과 기다리는 중 (#204): 진행 중이지만 이번 주 일정이 없는 지원. 오래 기다린 순이며, 트랙 점으로 단계를 바로 바꾼다.
// 처음에는 limit건만 보여주고 "나머지 N건 보기"로 그 자리에서 펼친다.
export function WaitingList({ items, scheduledCount, stage, moveError, onClearStage, onMove, onOpen, limit = 8 }: WaitingListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visible = isExpanded ? items : items.slice(0, limit);
  const hiddenCount = items.length - visible.length;

  return (
    <Card aria-labelledby="waiting-title" padding="flush" gap="none">
      {/* ── 머리: 제목·건수·단계 필터 해제 ── */}
      <div className={clsx('flex flex-wrap items-baseline justify-between gap-2 pb-3', ROW_PADDING)}>
        <h2 id="waiting-title" className="flex items-baseline gap-2 text-title-3 text-text-primary">
          결과 기다리는 중
          <span className="text-label font-semibold text-text-secondary tabular-nums">{items.length}</span>
          {stage && <span className="text-label font-normal text-text-secondary">· {STATUS_INFO[stage].label}만</span>}
        </h2>
        {stage ? (
          <button
            type="button"
            onClick={onClearStage}
            className="cursor-pointer rounded-xs text-label font-semibold text-text-brand hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            전체 보기
          </button>
        ) : (
          <span className="text-label text-text-secondary">오래 기다린 순</span>
        )}
      </div>

      {/* ── 단계 변경 실패 알림 ── */}
      <p role="alert" className={moveError ? clsx('mb-3 rounded-md bg-danger-tint py-2 text-label text-danger-text', 'mx-5 px-4 sm:mx-6') : 'sr-only'}>
        {moveError}
      </p>

      {/* ── 열 머리(넓은 화면만) ── */}
      <div aria-hidden="true" className={clsx('hidden border-t border-line-divider py-2 text-caption text-text-secondary lg:grid', ROW_PADDING, ROW_GRID)}>
        <span>회사</span>
        <span className="grid grid-cols-4 text-center">
          {ACTIVE_STATUSES.map((status) => (
            <span key={status}>{STATUS_INFO[status].label}</span>
          ))}
        </span>
        <span>다음 일정</span>
        <span className="text-right">지원 후</span>
      </div>

      {/* ── 목록(없으면 빈 상태) ── */}
      {items.length ? (
        <ul>
          {visible.map((item) => (
            // 단계 필터나 단계 변경으로 목록에 들어오고 빠지는 행만 움직인다(#176).
            <ViewTransition key={item.application.id} enter="row-enter" exit="row-exit" default="none">
              <WaitingRow item={item} onMove={onMove} onOpen={onOpen} />
            </ViewTransition>
          ))}
        </ul>
      ) : (
        <div className={ROW_PADDING}>
          <EmptyState icon="check" title="기다리는 지원이 없어요" description={stage ? '다른 단계를 골라 보세요' : '지원하면 결과가 나올 때까지 여기에 모여요'} />
        </div>
      )}

      {/* ── 아래: 나머지 펼치기·주간 일정에 있는 건수 ── */}
      {(hiddenCount > 0 || isExpanded) && items.length > limit && (
        <div className={clsx('border-t border-line-divider pt-3', ROW_PADDING)}>
          <Button variant="text" size="sm" className="-ml-2" aria-expanded={isExpanded} onClick={() => setIsExpanded((value) => !value)}>
            {isExpanded ? '접기' : `나머지 ${hiddenCount}건 보기`}
          </Button>
        </div>
      )}
      {scheduledCount > 0 && (
        <p className={clsx('pt-3 text-label text-text-secondary', ROW_PADDING)}>이번 주 일정이 있는 {scheduledCount}건은 위 주간 일정에 있어요.</p>
      )}
    </Card>
  );
}
