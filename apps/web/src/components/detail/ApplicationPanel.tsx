'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { StageTrack } from '@/components/board/StageTrack';
import { buttonClassName } from '@/components/common/buttonStyles';
import { Icon } from '@/components/common/Icon';
import { DiaryComposer } from '@/components/diary/DiaryComposer';
import { JourneyList } from '@/components/diary/JourneyList';
import { EditApplicationForm } from '@/components/modal/EditApplicationForm';
import { PLATFORM_INFO } from '@/constants/platform';
import { STATUS_INFO } from '@/constants/status';
import { useDialogFocus } from '@/hooks/useDialogFocus';
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

// 지원 상세 패널 (#175). 일정 캡슐·기다리는 목록·칸반 카드·홈의 일정/최근 지원에서 연다.
// 데스크톱은 오른쪽 패널, 모바일은 전체 화면. 키보드 기준은 공통 모달과 같다(useDialogFocus).
// 지원이 삭제되거나 계정이 바뀌어 목록에서 사라지면 부모가 패널을 그리지 않으므로 함께 닫힌다.
export function ApplicationPanel({ application, onClose, onMove, moveError }: ApplicationPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const clearError = useApplicationStore((state) => state.clearError);
  const [mode, setMode] = useState<'detail' | 'edit'>('detail');
  const [isBusy, setIsBusy] = useState(false); // 수정·삭제·기록 저장 중에는 닫지 않는다
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const hasSwitchedMode = useRef(false);
  const stageIndex = ACTIVE_STATUSES.indexOf(application.status);
  const postingUrl = getPostingUrl(application.url);

  const handleClose = useCallback(() => {
    if (isBusy) return;
    clearError();
    onClose();
  }, [clearError, isBusy, onClose]);

  useDialogFocus(panelRef, { isOpen: true, onClose: handleClose, closeDisabled: isBusy, initialFocus: 'container' });

  const switchMode = (next: 'detail' | 'edit') => {
    hasSwitchedMode.current = true;
    setMode(next);
  };

  const backToDetail = () => {
    clearError();
    switchMode('detail');
  };

  // 화면을 바꾸면 누른 버튼이 사라지므로 포커스를 옮긴다: 수정 화면은 첫 입력, 돌아오면 "정보 수정" 버튼.
  useEffect(() => {
    if (!hasSwitchedMode.current) return;
    if (mode === 'edit') panelRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus();
    else editButtonRef.current?.focus();
  }, [mode]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-overlay/20" onClick={handleClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute inset-0 flex flex-col bg-card transition duration-200 focus:outline-none starting:translate-x-4 starting:opacity-0 motion-reduce:transition-none md:inset-y-2 md:right-2 md:left-auto md:w-100 md:rounded-card md:border md:border-card-border md:shadow-float"
      >
        <header className="flex items-start gap-3 border-b border-card-border p-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-heading-md font-semibold text-text-primary">{application.company}</h2>
            <p className="truncate text-small text-text-secondary">{application.position || '공고명 없음'}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            aria-label="닫기"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-text-secondary hover:bg-column hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5">
          {mode === 'edit' ? (
            <section aria-labelledby="panel-edit-title">
              <h3 id="panel-edit-title" className="mb-3 text-legacy-label font-semibold text-text-muted">정보 수정</h3>
              <EditApplicationForm
                application={application}
                onClose={backToDetail}
                isSubmitting={isBusy}
                onSubmittingChange={setIsBusy}
              />
            </section>
          ) : (
            <>
              <section aria-labelledby="panel-stage-title">
                <h3 id="panel-stage-title" className="mb-2 flex items-baseline gap-2 text-legacy-label font-semibold text-text-muted">
                  단계
                  <span className="font-medium text-text-primary">{STATUS_INFO[application.status].label}</span>
                </h3>
                <StageTrack company={application.company} stageIndex={stageIndex} onMove={(status) => onMove(application.id, status)} labelsClassName="" />
                {stageIndex < 0 && (
                  <p className="mt-2 text-legacy-caption text-text-muted">결과가 나온 지원이에요. 점을 누르면 진행 단계로 되돌릴 수 있어요.</p>
                )}
                {moveError && (
                  <p role="alert" className="mt-2 text-legacy-label text-status-rejected-text">{moveError}</p>
                )}
              </section>

              <section aria-labelledby="panel-info-title">
                <h3 id="panel-info-title" className="mb-2 text-legacy-label font-semibold text-text-muted">정보</h3>
                <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-2 text-small">
                  <dt className="text-text-muted">플랫폼</dt>
                  <dd className="text-text-primary">{PLATFORM_INFO[application.platform].label}</dd>
                  <dt className="text-text-muted">지원일</dt>
                  <dd className="text-text-primary tabular-nums">{dateText(application.appliedAt)}</dd>
                  <dt className="text-text-muted">면접일</dt>
                  <dd className="text-text-primary tabular-nums">{dateText(application.interviewDate)}</dd>
                  <dt className="text-text-muted">공고 마감</dt>
                  <dd className="text-text-primary tabular-nums">{dateText(application.deadlineAt)}</dd>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button ref={editButtonRef} type="button" onClick={() => switchMode('edit')} className={buttonClassName('secondary', 'px-3 py-1 text-legacy-label')}>
                    <Icon name="pencil" className="h-3 w-3" />
                    정보 수정
                  </button>
                  {postingUrl && (
                    <a href={postingUrl} target="_blank" rel="noopener noreferrer" className={buttonClassName('secondary', 'px-3 py-1 text-legacy-label')}>
                      공고 열기
                      <Icon name="arrow-right" className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </section>

              <DiaryComposer key={application.id} application={application} onSavingChange={setIsBusy} />
              <JourneyList application={application} />
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
