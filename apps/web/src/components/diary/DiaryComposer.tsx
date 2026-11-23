'use client';

import { useId, useState } from 'react';
import { buttonClassName } from '@/components/common/buttonStyles';
import { useApplicationStore } from '@/store/applicationStore';
import type { Application } from '@/types/application';
import { createDiaryEntry, DIARY_MAX_LENGTH, DIARY_PROMPTS } from '@/utils/applicationJourney';

interface DiaryComposerProps {
  application: Application;
  onSavingChange: (isSaving: boolean) => void;
}

// 기록 남기기 (#175). 지금 단계에 맞는 질문 하나를 보여주고, 쓴 내용은 지원의 diary 배열 뒤에 붙여 저장한다.
// 다른 탭에서 먼저 바뀐 지원이면 expectedUpdatedAt 충돌로 저장하지 않고 입력한 글은 그대로 둔다.
export function DiaryComposer({ application, onSavingChange }: DiaryComposerProps) {
  const fieldId = useId();
  const updateApplication = useApplicationStore((state) => state.updateApplication);
  const clearError = useApplicationStore((state) => state.clearError);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const canSave = content.trim().length > 0 && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    // 낙관적 단계 변경 중이어도 저장 기준은 스토어의 최신 지원이다.
    const latest = useApplicationStore.getState().applications.find((item) => item.id === application.id);
    if (!latest) return;

    setIsSaving(true);
    onSavingChange(true);
    setError(null);
    setSavedNotice(false);
    try {
      const entry = createDiaryEntry(content, latest.status);
      const saved = await updateApplication(latest.id, { diary: [...(latest.diary ?? []), entry] }, latest.updatedAt);
      if (saved) {
        setContent('');
        setSavedNotice(true);
        return;
      }
      setError(useApplicationStore.getState().error ?? '기록을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
      clearError();
    } finally {
      setIsSaving(false);
      onSavingChange(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-2 rounded-card bg-column p-3"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
    >
      <label htmlFor={fieldId} className="text-label text-text-secondary">{DIARY_PROMPTS[application.status]}</label>
      <textarea
        id={fieldId}
        value={content}
        maxLength={DIARY_MAX_LENGTH}
        onChange={(event) => {
          setContent(event.target.value);
          setSavedNotice(false);
        }}
        onKeyDown={(event) => {
          // Ctrl/⌘ + Enter로 바로 남긴다
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            void handleSave();
          }
        }}
        rows={3}
        placeholder="짧게 적어도 괜찮아요."
        className="field-sizing-content min-h-20 w-full resize-none rounded-sm border border-card-border bg-card px-3 py-2 text-body text-text-primary placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-brand"
      />
      {error && <p role="alert" className="text-label text-status-rejected-text">{error}</p>}
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption text-text-muted" role="status">
          {savedNotice ? '기록을 남겼어요.' : `${content.length} / ${DIARY_MAX_LENGTH}`}
        </span>
        <button type="submit" disabled={!canSave} className={buttonClassName('primary', 'px-3 py-1 text-label')}>
          {isSaving ? '남기는 중...' : '기록 남기기'}
        </button>
      </div>
    </form>
  );
}
