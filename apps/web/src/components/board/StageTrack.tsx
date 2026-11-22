import { clsx } from 'clsx';
import { STATUS_INFO } from '@/constants/status';
import type { Status } from '@/types/application';
import { ACTIVE_STATUSES } from '@/utils/weekTimeline';

interface StageTrackProps {
  company: string;
  stageIndex: number;
  onMove: (status: Status) => void;
  // 주면 트랙 아래에 단계 이름을 보여준다(열 머리가 없는 곳). 예: 'lg:hidden'
  labelsClassName?: string;
}

// 진행 막대 길이. 첫 점부터 현재 점까지(전체 선은 1/8 ~ 7/8 지점). Tailwind가 읽도록 리터럴로 둔다.
const FILL_CLASS = ['w-0', 'w-1/4', 'w-2/4', 'w-3/4'];

// 받침이 있으면 "으로", 없거나 ㄹ 받침이면 "로" (면접예정으로, 서류통과로)
function withDirection(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}로`;
  const finalConsonant = code % 28;
  return finalConsonant === 0 || finalConsonant === 8 ? `${word}로` : `${word}으로`;
}

// 진행 중 4단계(지원완료·서류통과·면접예정·면접완료)를 점으로 잇는 트랙. 점을 누르면 그 단계로 옮긴다.
export function StageTrack({ company, stageIndex, onMove, labelsClassName }: StageTrackProps) {
  return (
    <div>
      <div className="relative grid h-7 grid-cols-4 items-center" role="group" aria-label={`${company} 단계`}>
        <span className="absolute top-1/2 right-1/8 left-1/8 h-1 -translate-y-1/2 rounded-full bg-column" aria-hidden="true" />
        <span
          className={clsx('absolute top-1/2 left-1/8 h-1 -translate-y-1/2 rounded-full bg-linear-to-r from-border-strong to-brand transition-[width] duration-300 motion-reduce:transition-none', FILL_CLASS[stageIndex])}
          aria-hidden="true"
        />
        {ACTIVE_STATUSES.map((status, index) => {
          const label = STATUS_INFO[status].label;
          const isCurrent = index === stageIndex;
          return (
            <button
              key={status}
              type="button"
              onClick={() => {
                if (!isCurrent) onMove(status);
              }}
              aria-label={isCurrent ? `${label} (현재 단계)` : `${withDirection(label)} 옮기기`}
              aria-current={isCurrent ? 'step' : undefined}
              className={clsx(
                'group relative z-10 flex h-6 w-6 items-center justify-center justify-self-center rounded-full focus-visible:outline-2 focus-visible:outline-brand',
                isCurrent ? 'cursor-default' : 'cursor-pointer',
              )}
            >
              <span
                className={clsx(
                  'rounded-full transition-transform motion-reduce:transition-none',
                  isCurrent && 'h-3 w-3 bg-brand ring-4 ring-brand/15',
                  index < stageIndex && 'h-2 w-2 bg-border-strong group-hover:scale-150',
                  index > stageIndex && 'h-2 w-2 bg-card ring-2 ring-card-border ring-inset group-hover:scale-150 group-hover:ring-brand',
                )}
              />
            </button>
          );
        })}
      </div>
      {labelsClassName !== undefined && (
        <div className={clsx('grid grid-cols-4 text-center text-badge text-text-muted', labelsClassName)} aria-hidden="true">
          {ACTIVE_STATUSES.map((status, index) => (
            <span key={status} className={clsx(index === stageIndex && 'font-semibold text-text-primary')}>{STATUS_INFO[status].label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
