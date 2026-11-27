'use client';

import { clsx } from 'clsx';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { StageTrack, withDirection } from '@/components/ui/StageTrack';
import { TextField } from '@/components/ui/TextField';
import { useHiringProcessPriority } from '@/hooks/useHiringProcessFill';
import { useApplicationStore } from '@/store/applicationStore';
import type { Application, ProcessStep, Status } from '@/types/application';
import { createHiringProcess, findSamePostingApplications, formatProcessInput, getCurrentStepIndex, parseProcessInput, statusForStep } from '@/utils/hiringProcess';
import { ACTIVE_STATUSES } from '@/utils/weekTimeline';

interface ProcessSectionProps {
  application: Application;
  onMove: (applicationId: string, status: Status) => void;
}

const SOURCE_NOTE: Record<string, string> = {
  text: '공고에 적힌 전형 절차예요.',
  ai: '공고 이미지에서 읽은 전형 절차예요.',
  manual: '직접 고친 전형 절차예요.',
};
const EXAMPLE = '서류 > 코딩테스트 > 1차 면접 > 최종 합격';

// 지원별 전형 절차 트랙 (#295). 단계 이름은 공고 그대로, 점은 디자인 시스템 StageTrack과 같은 모양이다.
// 점을 누르면 그 단계로 옮기고, 지원 단계(통계·보드)는 종류로 따라 바뀐다(코딩테스트 → 서류 통과, 2차 면접 → 면접 예정).
function ProcessTrack({ company, steps, currentIndex, onSelect }: { company: string; steps: ProcessStep[]; currentIndex: number; onSelect: (index: number) => void }) {
  const columns = { gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` };
  // 진행 막대는 첫 점 가운데부터 지금 점 가운데까지(데이터로 정해지는 길이라 inline style)
  const edge = `${50 / steps.length}%`;
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
      <div className="grid gap-1 pt-1 text-center text-caption font-normal break-keep text-text-secondary" style={columns} aria-hidden="true">
        {steps.map((step, index) => (
          <span key={`${index}-${step.name}`} className={clsx(index === currentIndex && 'font-semibold text-text-primary')}>
            {step.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// 상세 패널 "단계" 안: 전형 절차가 있으면 지원별 트랙, 없으면 기본 4단계 트랙. 아래에 절차 고치기.
export function ProcessSection({ application, onMove }: ProcessSectionProps) {
  const saveHiringProcess = useApplicationStore((state) => state.saveHiringProcess);
  const process = application.hiringProcess;
  const steps = process && process.steps.length >= 2 ? process.steps : null;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // 아직 안 읽은 지원이면 다음 차례로 올린다(#299)
  const isReading = useHiringProcessPriority(application);

  // ── 점 누르기: 지원 단계가 바뀌면 옮기고(보드·통계), 같은 지원 단계 안(1차 → 2차 면접)이면 고른 단계만 저장 ──
  const selectStep = (index: number) => {
    if (!steps || !process) return;
    const status = statusForStep(steps[index]);
    if (status !== application.status) onMove(application.id, status);
    void saveHiringProcess(application.id, { ...process, step: index });
  };

  // ── 절차 고치기: "서류 > 코딩테스트 > 1차 면접" 한 줄 ──
  const startEdit = () => {
    setDraft(steps ? formatProcessInput(steps) : '');
    setError(null);
    setIsEditing(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseProcessInput(draft);
    if (parsed.length < 2) {
      setError(`단계를 > 로 나눠 두 단계 이상 적어 주세요. 예: ${EXAMPLE}`);
      return;
    }
    setIsSaving(true);
    const manual = createHiringProcess(parsed, 'manual');
    const saved = await saveHiringProcess(application.id, manual);
    if (!saved) {
      setIsSaving(false);
      setError('전형 절차를 저장하지 못했어요. 잠시 후 다시 해 주세요.');
      return;
    }
    // 같은 공고에 다시 지원한 지원도 같은 절차다. 직접 고치지 않은 것만 맞춘다(#299)
    const siblings = findSamePostingApplications(useApplicationStore.getState().applications, application);
    for (const sibling of siblings) {
      if (sibling.hiringProcess?.source !== 'manual') await saveHiringProcess(sibling.id, manual);
    }
    setIsSaving(false);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form onSubmit={save} noValidate className="flex flex-col gap-3">
        <TextField
          id={`process-${application.id}`}
          label="전형 절차"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError(null);
          }}
          placeholder={EXAMPLE}
          hint="단계 사이를 > 로 나눠 주세요. 이름에 맞춰 서류·테스트·면접·최종으로 나눠 셉니다."
          error={error}
          readOnly={isSaving}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
            취소
          </Button>
          <Button type="submit" size="sm" isLoading={isSaving} loadingLabel="저장 중">
            저장
          </Button>
        </div>
      </form>
    );
  }

  const isClosed = ['offer', 'rejected', 'canceled'].includes(application.status);
  return (
    <div className="flex flex-col gap-2">
      {steps ? (
        <ProcessTrack company={application.company} steps={steps} currentIndex={getCurrentStepIndex(application, steps)} onSelect={selectStep} />
      ) : (
        <StageTrack company={application.company} stageIndex={ACTIVE_STATUSES.indexOf(application.status)} onMove={(status) => onMove(application.id, status)} labelsClassName="" />
      )}
      {isClosed && <p className="text-label text-text-secondary">끝난 지원이에요. 점을 누르면 진행 중으로 되돌릴 수 있어요.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-label text-text-secondary">{steps && process ? SOURCE_NOTE[process.source] : isReading ? '공고에서 전형 절차를 읽고 있어요.' : '공고에 전형 절차가 있으면 지원마다 단계가 맞춰져요.'}</p>
        <Button variant="text" size="sm" onClick={startEdit}>
          {steps ? '절차 고치기' : '절차 넣기'}
        </Button>
      </div>
    </div>
  );
}
