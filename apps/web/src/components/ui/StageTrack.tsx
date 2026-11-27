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

// 받침이 있으면 "으로", 없거나 ㄹ 받침이면 "로" (면접 예정으로, 서류 통과로)
export function withDirection(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}로`;
  const finalConsonant = code % 28;
  return finalConsonant === 0 || finalConsonant === 8 ? `${word}로` : `${word}으로`;
}

// 디자인 시스템 단계 트랙 (#201, 지원보드에서 옮김). 진행 중 4단계를 점으로 잇고, 점을 누르면 그 단계로 옮긴다.
// 지난 단계는 채운 점, 지금 단계는 큰 점 + 하늘 테두리, 앞 단계는 빈 점. 키보드로 Tab 이동·Enter로 옮길 수 있다.
// 결과(합격·탈락·지원 취소)는 트랙이 아니라 뱃지로 보여준다.
export function StageTrack({ company, stageIndex, onMove, labelsClassName }: StageTrackProps) {
  return (
    <div>
      <div className="relative grid h-7 grid-cols-4 items-center" role="group" aria-label={`${company} 단계`}>
        <span className="absolute top-1/2 right-1/8 left-1/8 h-1 -translate-y-1/2 rounded-full bg-line-divider" aria-hidden="true" />
        <span
          className={clsx('absolute top-1/2 left-1/8 h-1 -translate-y-1/2 rounded-full bg-action-primary transition-[width] duration-base ease-soft motion-reduce:transition-none', FILL_CLASS[stageIndex])}
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
                // 누르는 영역 24×24 (WCAG 2.2 목표 크기 최소 기준)
                'group relative z-10 flex h-6 w-6 items-center justify-center justify-self-center rounded-full focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                isCurrent ? 'cursor-default' : 'cursor-pointer',
              )}
            >
              <span
                className={clsx(
                  'rounded-full transition-transform duration-fast motion-reduce:transition-none',
                  isCurrent && 'h-3 w-3 bg-action-primary ring-4 ring-selected',
                  index < stageIndex && 'h-2 w-2 bg-action-primary group-hover:scale-150',
                  index > stageIndex && 'h-2 w-2 bg-surface ring-2 ring-line-input ring-inset group-hover:scale-150 group-hover:ring-action-primary',
                )}
              />
            </button>
          );
        })}
      </div>
      {labelsClassName !== undefined && (
        <div className={clsx('grid grid-cols-4 text-center text-caption font-normal text-text-secondary', labelsClassName)} aria-hidden="true">
          {ACTIVE_STATUSES.map((status, index) => (
            <span key={status} className={clsx(index === stageIndex && 'font-semibold text-text-primary')}>{STATUS_INFO[status].label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
