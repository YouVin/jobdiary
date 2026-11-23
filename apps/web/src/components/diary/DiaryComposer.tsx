'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/TextField';
import { useApplicationStore } from '@/store/applicationStore';
import type { Application } from '@/types/application';
import { createDiaryEntry, DIARY_MAX_LENGTH, DIARY_PROMPTS } from '@/utils/applicationJourney';

interface DiaryComposerProps {
  application: Application;
  onSavingChange: (isSaving: boolean) => void;
}

// 기록 남기기 (#175, #205). 지금 단계에 맞는 질문 하나를 이름표로 보여주고, 쓴 내용은 지원의 diary 배열 뒤에 붙여 저장한다.
// 다른 탭에서 먼저 바뀐 지원이면 expectedUpdatedAt 충돌로 저장하지 않고 입력한 글은 그대로 둔다.
// 남긴 결과는 토스트가 아니라 이 폼 안 알림 영역으로 알린다(#205). 누른 자리 가까이에서 알리는 편이 분명하고,
// aria-modal 창 밖을 읽지 않는 화면 읽기 환경(WebKit·VoiceOver 등)에서도 들린다. 오류는 칸 아래에 둔다.
export function DiaryComposer({ application, onSavingChange }: DiaryComposerProps) {
  const updateApplication = useApplicationStore((state) => state.updateApplication);
  const clearError = useApplicationStore((state) => state.clearError);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const isEmpty = content.trim().length === 0;

  const handleSave = async () => {
    if (isSaving) return;
    if (isEmpty) {
      setError('남길 내용을 적어 주세요.');
      return;
    }
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
      aria-label="기록 남기기"
      className="flex flex-col gap-3 rounded-lg bg-subtle p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
    >
      <TextAreaField
        label={DIARY_PROMPTS[application.status]}
        value={content}
        maxLength={DIARY_MAX_LENGTH}
        onChange={(event) => {
          setContent(event.target.value);
          setSavedNotice(false);
          if (error) setError(null);
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
        hint="Ctrl(⌘) + Enter로 바로 남길 수 있어요"
        error={error}
        readOnly={isSaving}
      />
      <div className="flex items-center justify-between gap-2">
        <span role="status" className={savedNotice ? 'text-label font-semibold text-success-text' : 'text-caption font-normal text-text-secondary tabular-nums'}>
          {savedNotice ? '기록을 남겼어요.' : <span aria-hidden="true">{content.length} / {DIARY_MAX_LENGTH}</span>}
        </span>
        <Button type="submit" size="sm" isLoading={isSaving} loadingLabel="남기는 중">
          기록 남기기
        </Button>
      </div>
    </form>
  );
}
