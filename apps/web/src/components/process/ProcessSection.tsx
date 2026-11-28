'use client';

import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useHiringProcessPriority } from '@/hooks/useHiringProcessFill';
import { useApplicationStore } from '@/store/applicationStore';
import type { Application } from '@/types/application';
import { createHiringProcess, findSamePostingApplications, formatProcessInput, getProcessSteps, parseProcessInput } from '@/utils/hiringProcess';

interface ProcessSectionProps {
  application: Application;
  // 단계 트랙은 부모(상세 패널)가 만들어 넘긴다(#312). 이 구역은 단계 옮기기(onMove)를 몰라도 된다.
  track: ReactNode;
}

const SOURCE_NOTE: Record<string, string> = {
  text: '공고에 적힌 전형 절차예요.',
  ai: '공고 이미지에서 읽은 전형 절차예요.',
  manual: '직접 고친 전형 절차예요.',
};
const EXAMPLE = '서류 > 코딩테스트 > 1차 면접 > 최종 합격';

// 상세 패널 "단계" 안: 전형 절차가 있으면 지원별 트랙, 없으면 기본 4단계 트랙. 아래에 절차 고치기.
export function ProcessSection({ application, track }: ProcessSectionProps) {
  const saveHiringProcess = useApplicationStore((state) => state.saveHiringProcess);
  const process = application.hiringProcess;
  const steps = getProcessSteps(application);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // 아직 안 읽은 지원이면 다음 차례로 올린다(#299)
  const isReading = useHiringProcessPriority(application);

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
          hint="단계 사이를 > 로 나눠 주세요. 이름에 맞춰 서류, 테스트, 면접, 최종으로 나눠 세요."
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
      {track}
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
