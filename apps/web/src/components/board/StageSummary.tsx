import { clsx } from 'clsx';
import { STAGE_DOT_CLASS } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { STATUS_INFO } from '@/constants/status';
import type { Status } from '@/types/application';
import type { ResultStatus } from '@/utils/waitingList';
import { ACTIVE_STATUSES } from '@/utils/weekTimeline';

interface StagePillsProps {
  counts: Record<Status, number>;
  resultTotal: number;
  stage: Status | null;
  onStageChange: (stage: Status | null) => void;
}

// 단계별 숫자 버튼 (#204, 캔버스 주간 시안). 누르면 아래 "결과 기다리는 중"을 그 단계만 남기고, 다시 누르면 푼다.
// 켜진 버튼은 selected 바탕 + 파란 숫자로, 눌림 상태는 aria-pressed로 알린다. 끝에 결과 나온 건수(누를 수 없음).
// 칸마다 단계 이름과 숫자를 가운데에 맞춘다(#215 피드백).
export function StagePills({ counts, resultTotal, stage, onStageChange }: StagePillsProps) {
  return (
    <Card padding="xs">
      <div role="group" aria-label="단계별 보기" className="grid grid-cols-2 gap-1 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
        {ACTIVE_STATUSES.map((status) => {
          const isPressed = stage === status;
          const count = counts[status];
          return (
            <button
              key={status}
              type="button"
              aria-pressed={isPressed}
              onClick={() => onStageChange(isPressed ? null : status)}
              className={clsx(
                'flex cursor-pointer flex-col items-center gap-1 rounded-md px-4 py-3 text-center transition-colors duration-fast focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                isPressed ? 'bg-selected' : 'hover:bg-subtle',
              )}
            >
              <span className="flex items-center gap-2 text-label text-text-secondary">
                <span aria-hidden="true" className={clsx('h-2 w-2 shrink-0 rounded-xs', STAGE_DOT_CLASS[status])} />
                {STATUS_INFO[status].label}
              </span>
              <span
                className={clsx(
                  'text-title-1 tabular-nums',
                  isPressed ? 'text-text-brand-strong' : count === 0 ? 'text-text-secondary' : 'text-text-primary',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
        <div className="col-span-2 flex flex-col items-center gap-1 rounded-md bg-subtle px-4 py-3 text-center sm:col-span-1">
          <span className="text-label text-text-secondary">결과 나옴</span>
          <span className="text-title-1 text-text-secondary tabular-nums">{resultTotal}</span>
        </div>
      </div>
    </Card>
  );
}

const RESULT_ORDER: ResultStatus[] = ['offer', 'rejected', 'canceled'];

interface ResultRowProps {
  counts: Record<ResultStatus, number>;
  total: number;
  onShowBoard: () => void; // 보드 보기로 바꾸기
}

// 결과가 나온 지원 한 줄 (#204). 합격·탈락·지원 취소 건수와 보드 보기로 가는 버튼.
export function ResultRow({ counts, total, onShowBoard }: ResultRowProps) {
  return (
    <Card padding="sm">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <h2 className="text-body text-text-secondary">
        <b className="font-semibold text-text-primary tabular-nums">결과가 나온 지원 {total}건</b>
        {RESULT_ORDER.map((status) => (
          <span key={status} className="tabular-nums">
            {' · '}
            {STATUS_INFO[status].label} {counts[status]}
          </span>
        ))}
      </h2>
      <button
        type="button"
        onClick={onShowBoard}
        className="cursor-pointer rounded-xs text-body font-semibold text-text-brand hover:text-action-hover hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        보드에서 보기
      </button>
      </div>
    </Card>
  );
}
