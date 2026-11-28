import { clsx } from 'clsx';

// 받침이 있으면 "으로", 없거나 ㄹ 받침이면 "로" (면접 예정으로, 서류 통과로, 2차 면접으로)
export function withDirection(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}로`;
  const finalConsonant = code % 28;
  return finalConsonant === 0 || finalConsonant === 8 ? `${word}로` : `${word}으로`;
}

interface StepTrackProps {
  // 화면 읽기용 묶음 이름. 예: "A사 단계", "A사 전형 절차"
  groupLabel: string;
  steps: string[];
  // 지금 단계 번호. -1이면 지금 단계 없음(끝난 지원)
  currentIndex: number;
  onSelect: (index: number) => void;
  // 주면 트랙 아래에 단계 이름을 보여준다(열 머리가 없는 곳)
  labelsClassName?: string;
}

// 디자인 시스템 단계 트랙 (#201, #295, #306). 단계를 점으로 잇고, 점을 누르면 그 단계로 옮긴다.
// 지난 단계는 채운 점, 지금 단계는 큰 점 + 하늘 테두리, 앞 단계는 빈 점. 누르는 영역 24×24, Tab 이동·Enter로 옮긴다.
// 단계 수는 정해져 있지 않다(기본 4단계 StageTrack, 공고마다 2~10단계 전형 절차). 그래서 열 수와 진행 막대 길이는 inline style.
// 데이터(스토어·API)를 모르는 화면 부품이다. 지원에 잇는 일은 process/ApplicationProcessTrack이 한다.
export function StepTrack({ groupLabel, steps, currentIndex, onSelect, labelsClassName }: StepTrackProps) {
  const columns = { gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` };
  // 진행 막대는 첫 점 가운데부터 지금 점 가운데까지
  const edge = `${50 / steps.length}%`;
  const fill = `${(Math.max(currentIndex, 0) / steps.length) * 100}%`;
  // 단계가 많으면(7개 이상) 이름이 서로 겹쳐 지금 단계 이름만 두고, 나머지는 점에 마우스를 올리면 보인다
  const isDense = steps.length > 6;

  return (
    <div>
      <div className="relative grid h-7 items-center" style={columns} role="group" aria-label={groupLabel}>
        <span className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-line-divider" style={{ left: edge, right: edge }} aria-hidden="true" />
        <span
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-action-primary transition-[width] duration-base ease-soft motion-reduce:transition-none"
          style={{ left: edge, width: fill }}
          aria-hidden="true"
        />
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          return (
            <button
              key={`${index}-${step}`}
              type="button"
              onClick={() => {
                if (!isCurrent) onSelect(index);
              }}
              aria-label={isCurrent ? `${step} (현재 단계)` : `${withDirection(step)} 옮기기`}
              aria-current={isCurrent ? 'step' : undefined}
              title={isDense ? step : undefined}
              className={clsx(
                'group relative z-10 flex h-6 w-6 items-center justify-center justify-self-center rounded-full focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                isCurrent ? 'cursor-default' : 'cursor-pointer',
              )}
            >
              <span
                className={clsx(
                  'rounded-full transition-transform duration-fast motion-reduce:transition-none',
                  isCurrent && 'h-3 w-3 bg-action-primary ring-4 ring-selected',
                  index < currentIndex && 'h-2 w-2 bg-action-primary group-hover:scale-150',
                  index > currentIndex && 'h-2 w-2 bg-surface ring-2 ring-line-input ring-inset group-hover:scale-150 group-hover:ring-action-primary',
                )}
              />
            </button>
          );
        })}
      </div>
      {labelsClassName !== undefined && (
        <div className={clsx('grid gap-1 pt-1 text-center text-caption font-normal break-keep text-text-secondary', labelsClassName)} style={columns} aria-hidden="true">
          {steps.map((step, index) => {
            const isCurrent = index === currentIndex;
            if (isDense && !isCurrent) return <span key={`${index}-${step}`} />;
            return (
              <span key={`${index}-${step}`} className={clsx('flex justify-center', isCurrent && 'font-semibold text-text-primary')}>
                <span className={clsx(isDense && 'whitespace-nowrap')}>{step}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 카드용 작은 트랙 (#303). 카드 폭을 꽉 채우고 점 사이를 선으로 잇는다(StepTrack을 줄인 모양).
// 누를 수 없고(카드 끌기·열기와 겹치지 않게) 화면 읽기는 옆에 둔 글자로 한다.
export function StepDots({ total, currentIndex }: { total: number; currentIndex: number }) {
  return (
    <span className="flex w-full items-center" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={clsx('flex items-center', index > 0 && 'flex-1')}>
          {index > 0 && <span className={clsx('h-1 flex-1 rounded-full', index <= currentIndex ? 'bg-action-primary' : 'bg-line-divider')} />}
          <span
            className={clsx(
              'h-2 w-2 shrink-0 rounded-full',
              index === currentIndex && 'bg-action-primary ring-2 ring-selected',
              index < currentIndex && 'bg-action-primary',
              index > currentIndex && 'bg-surface ring-2 ring-line-input ring-inset',
            )}
          />
        </span>
      ))}
    </span>
  );
}
