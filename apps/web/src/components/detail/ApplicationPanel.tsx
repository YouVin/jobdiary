'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CompanyInfoSection } from '@/components/detail/CompanyInfoSection';
import { DiaryComposer } from '@/components/diary/DiaryComposer';
import { JourneyList } from '@/components/diary/JourneyList';
import { EditApplicationForm } from '@/components/modal/EditApplicationForm';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClassName } from '@/components/ui/Button';
import { SidePanel } from '@/components/ui/Overlay';
import { StageTrack } from '@/components/ui/StageTrack';
import { PLATFORM_INFO } from '@/constants/platform';
import { STATUS_INFO } from '@/constants/status';
import { useApplicationStore } from '@/store/applicationStore';
import type { Application, Status } from '@/types/application';
import { toDateOnly } from '@/utils/applicationStats';
import { formatDateWithWeekday } from '@/utils/format';
import { getPostingUrl } from '@/utils/postingUrl';
import { ACTIVE_STATUSES } from '@/utils/weekTimeline';

interface ApplicationPanelProps {
  application: Application;
  onClose: () => void;
  onMove: (applicationId: string, status: Status) => void;
  moveError: string | null;
}

function dateText(value: string | undefined): string {
  const date = toDateOnly(value);
  return date ? formatDateWithWeekday(date, true) : '없음';
}

// 결과 단계는 트랙이 아니라 뱃지로 보여준다 (디자인 시스템 StageTrack 규칙).
const RESULT_TONE: Partial<Record<Status, 'success' | 'danger' | 'default'>> = { offer: 'success', rejected: 'danger', canceled: 'default' };

// 지원 상세 패널 (#175, #205 디자인 시스템 SidePanel). 일정 줄·기다리는 목록·칸반 카드·홈 일정/달력에서 연다.
// 데스크톱은 오른쪽 440, 모바일은 아래 시트. 키보드 기준은 공통 창과 같다(useDialogFocus: 포커스 가두기·Esc·되돌리기).
// 지원이 삭제되거나 계정이 바뀌어 목록에서 사라지면 부모가 패널을 그리지 않으므로 함께 닫힌다.
export function ApplicationPanel({ application, onClose, onMove, moveError }: ApplicationPanelProps) {
  const clearError = useApplicationStore((state) => state.clearError);
  const [mode, setMode] = useState<'detail' | 'edit'>('detail');
  const [isBusy, setIsBusy] = useState(false); // 수정·삭제·기록 저장 중에는 닫지 않는다
  const [notice, setNotice] = useState<string | null>(null); // 패널 안 알림(정보 수정 완료). 누른 자리 가까이, aria-modal 안에서 알린다
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const hasSwitchedMode = useRef(false);
  const stageIndex = ACTIVE_STATUSES.indexOf(application.status);
  const postingUrl = getPostingUrl(application.url);
  const resultTone = RESULT_TONE[application.status];

  const handleClose = useCallback(() => {
    if (isBusy) return;
    clearError();
    onClose();
  }, [clearError, isBusy, onClose]);

  const switchMode = (next: 'detail' | 'edit') => {
    hasSwitchedMode.current = true;
    if (next === 'edit') setNotice(null);
    setMode(next);
  };

  const backToDetail = () => {
    clearError();
    switchMode('detail');
  };

  // 화면을 바꾸면 누른 버튼이 사라지므로 포커스를 옮긴다: 수정 화면은 첫 입력, 돌아오면 "정보 수정" 버튼.
  useEffect(() => {
    if (!hasSwitchedMode.current) return;
    if (mode === 'edit') bodyRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus();
    else editButtonRef.current?.focus();
  }, [mode]);

  return (
    <SidePanel isOpen onClose={handleClose} title={application.company} description={application.position || '공고명 없음'} closeDisabled={isBusy}>
      <div ref={bodyRef} className="flex flex-col gap-6">
        {mode === 'edit' ? (
          <section aria-labelledby="panel-edit-title" className="flex flex-col gap-3">
            <h3 id="panel-edit-title" className="text-label font-semibold text-text-secondary">
              정보 수정
            </h3>
            <EditApplicationForm
              application={application}
              onClose={backToDetail}
              isSubmitting={isBusy}
              onSubmittingChange={setIsBusy}
              onSaved={() => setNotice('정보를 고쳤어요.')}
            />
          </section>
        ) : (
          <>
            <section aria-labelledby="panel-stage-title" className="flex flex-col gap-2">
              <h3 id="panel-stage-title" className="flex items-center gap-2 text-label font-semibold text-text-secondary">
                단계
                {resultTone ? (
                  <Badge tone={resultTone}>{STATUS_INFO[application.status].label}</Badge>
                ) : (
                  <span className="text-text-primary">{STATUS_INFO[application.status].label}</span>
                )}
              </h3>
              <StageTrack company={application.company} stageIndex={stageIndex} onMove={(status) => onMove(application.id, status)} labelsClassName="" />
              {stageIndex < 0 && <p className="text-label text-text-secondary">결과가 나온 지원이에요. 점을 누르면 진행 단계로 되돌릴 수 있어요.</p>}
              <p role="alert" className={moveError ? 'text-label text-danger-text' : 'sr-only'}>
                {moveError}
              </p>
            </section>

            <section aria-labelledby="panel-info-title" className="flex flex-col gap-3">
              <h3 id="panel-info-title" className="text-label font-semibold text-text-secondary">
                정보
              </h3>
              <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-body">
                <dt className="text-text-secondary">지원 경로</dt>
                <dd className="text-text-primary">{PLATFORM_INFO[application.platform].label}</dd>
                <dt className="text-text-secondary">지원일</dt>
                <dd className="text-text-primary tabular-nums">{dateText(application.appliedAt)}</dd>
                <dt className="text-text-secondary">면접일</dt>
                <dd className="text-text-primary tabular-nums">{dateText(application.interviewDate)}</dd>
                <dt className="text-text-secondary">공고 마감</dt>
                <dd className="text-text-primary tabular-nums">{dateText(application.deadlineAt)}</dd>
              </dl>
              <p role="status" className={notice ? 'text-label font-semibold text-success-text' : 'sr-only'}>
                {notice}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button ref={editButtonRef} variant="secondary" size="sm" icon="pencil" onClick={() => switchMode('edit')}>
                  정보 수정
                </Button>
                {postingUrl && (
                  <a href={postingUrl} target="_blank" rel="noopener noreferrer" className={buttonClassName({ variant: 'secondary', size: 'sm' })}>
                    공고 열기
                    <span className="sr-only"> (새 탭에서 열림)</span>
                  </a>
                )}
              </div>
            </section>

            <CompanyInfoSection key={`company-${application.id}`} applicationId={application.id} postingUrl={application.url} />

            <DiaryComposer key={application.id} application={application} onSavingChange={setIsBusy} />
            <JourneyList application={application} />
          </>
        )}
      </div>
    </SidePanel>
  );
}
