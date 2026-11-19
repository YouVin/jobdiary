import { clsx } from 'clsx';
import { STATUS_DOT_CLASS, STATUS_INFO } from '@/constants/status';
import type { Status } from '@/types/application';
import type { ResultStatus } from '@/utils/waitingList';
import { ACTIVE_STATUSES } from '@/utils/weekTimeline';

interface StagePillsProps {
  counts: Record<Status, number>;
  resultTotal: number;
  stage: Status | null;
  onStageChange: (stage: Status | null) => void;
}

// 진행 단계 버튼 한 줄. 누르면 아래 "결과 기다리는 중" 목록을 그 단계만 남기고, 다시 누르면 푼다.
export function StagePills({ counts, resultTotal, stage, onStageChange }: StagePillsProps) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-2 md:flex md:items-center" role="group" aria-label="단계별 보기">
      {ACTIVE_STATUSES.map((status) => {
        const isPressed = stage === status;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={isPressed}
            onClick={() => onStageChange(isPressed ? null : status)}
            className={clsx(
              'flex h-10 min-w-0 items-center justify-between gap-2 rounded-full border px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:flex-1',
              isPressed ? 'border-text-primary bg-text-primary text-on-brand' : 'border-card-border bg-card text-text-secondary hover:border-border-strong',
            )}
          >
            <span className="flex min-w-0 items-center gap-2 truncate text-small">
              <span className={clsx('h-2 w-2 shrink-0 rounded-full', STATUS_DOT_CLASS[status])} aria-hidden="true" />
              {STATUS_INFO[status].label}
            </span>
            <b className={clsx('text-body font-bold tabular-nums', !isPressed && 'text-text-primary')}>{counts[status]}</b>
          </button>
        );
      })}
      <span className="col-span-2 px-2 text-small text-text-muted md:col-span-1 md:shrink-0">
        결과 나옴 <b className="font-semibold text-text-secondary tabular-nums">{resultTotal}</b>
      </span>
    </div>
  );
}

const RESULT_ORDER: ResultStatus[] = ['rejected', 'offer', 'canceled'];

// 합격·탈락·지원취소 건수 한 줄
export function ResultRow({ counts, total }: { counts: Record<ResultStatus, number>; total: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1 text-small text-text-secondary">
      <h2 className="mr-auto font-medium">결과가 나온 지원 {total}건</h2>
      {RESULT_ORDER.map((status) => (
        <span key={status} className="inline-flex items-center gap-2">
          <span className={clsx('h-2 w-2 rounded-full', STATUS_DOT_CLASS[status])} aria-hidden="true" />
          {STATUS_INFO[status].label} <b className="text-text-primary tabular-nums">{counts[status]}</b>
        </span>
      ))}
    </div>
  );
}
