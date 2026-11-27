'use client';

import { clsx } from 'clsx';
import { StageTrack, withDirection } from '@/components/ui/StageTrack';
import { useProcessStep } from '@/hooks/useProcessStep';
import type { Application, ProcessStep, Status } from '@/types/application';
import { ACTIVE_STATUSES } from '@/utils/weekTimeline';

// 지원별 전형 절차 트랙 (#295). 단계 이름은 공고 그대로, 점은 디자인 시스템 StageTrack과 같은 모양이다.
// 점을 누르면 그 단계로 옮기고, 지원 단계(통계·보드)는 종류로 따라 바뀐다(코딩테스트 → 서류 통과, 2차 면접 → 면접 예정).
// 단계 수가 지원마다 달라(2~10개) 열 수와 진행 막대 길이는 데이터로 정해져 inline style로 둔다.
export function ProcessTrack({ company, steps, currentIndex, onSelect }: { company: string; steps: ProcessStep[]; currentIndex: number; onSelect: (index: number) => void }) {
  const columns = { gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` };
  // 진행 막대는 첫 점 가운데부터 지금 점 가운데까지
  const edge = `${50 / steps.length}%`;
  const isDense = steps.length > 6;
  return (
    <div>
      <div className="relative grid h-7 items-center" style={columns} role="group" aria-label={`${company} 전형 절차`}>
        <span className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-line-divider" style={{ left: edge, right: edge }} aria-hidden="true" />
        <span
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-action-primary transition-[width] duration-base ease-soft motion-reduce:transition-none"
          style={{ left: edge, width: `${(currentIndex / steps.length) * 100}%` }}
          aria-hidden="true"
        />
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          return (
            <button
              key={`${index}-${step.name}`}
              type="button"
              onClick={() => {
                if (!isCurrent) onSelect(index);
              }}
              aria-label={isCurrent ? `${step.name} (현재 단계)` : `${withDirection(step.name)} 옮기기`}
              aria-current={isCurrent ? 'step' : undefined}
              title={isDense ? step.name : undefined}
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
      {/* 단계가 많으면(7개 이상) 이름이 서로 겹쳐 지금 단계 이름만 두고, 나머지는 점에 마우스를 올리면 보인다(#303) */}
      <div className="grid gap-1 pt-1 text-center text-caption font-normal break-keep text-text-secondary" style={columns} aria-hidden="true">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          if (isDense && !isCurrent) return <span key={`${index}-${step.name}`} />;
          return (
            <span key={`${index}-${step.name}`} className={clsx('flex justify-center', isCurrent && 'font-semibold text-text-primary')}>
              <span className={clsx(isDense && 'whitespace-nowrap')}>{step.name}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// 지원 한 건의 단계 트랙: 전형 절차가 있으면 지원별 트랙, 없으면 기본 4단계 트랙(이름 함께). 점을 누르면 바로 옮긴다.
// 상세 패널(#295)과 결과 기다리는 중(#303)이 같이 쓴다.
export function ApplicationProcessTrack({ application, onMove }: { application: Application; onMove: (applicationId: string, status: Status) => void }) {
  const { steps, currentIndex, selectStep } = useProcessStep(application, onMove);
  if (steps) return <ProcessTrack company={application.company} steps={steps} currentIndex={currentIndex} onSelect={(index) => void selectStep(index)} />;
  return <StageTrack company={application.company} stageIndex={ACTIVE_STATUSES.indexOf(application.status)} onMove={(status) => onMove(application.id, status)} labelsClassName="" />;
}

// 칸반 카드용 작은 트랙 (#303). 카드 폭을 꽉 채우고 점 사이를 선으로 잇는다(큰 트랙과 같은 모양을 줄인 것).
// 누를 수 없고(카드 끌기·열기와 겹치지 않게) 화면 읽기는 아래 글자 줄로 한다.
export function ProcessDots({ total, currentIndex }: { total: number; currentIndex: number }) {
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
