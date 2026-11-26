'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Overlay';
import { TextAreaField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { FEEDBACK_MAX_LENGTH, sendFeedback } from '@/lib/feedbackApi';

const MESSAGES = {
  limited: '오늘은 의견을 충분히 보내셨어요. 내일 다시 보내 주세요.',
  failed: '의견을 보내지 못했어요. 잠시 후 다시 해 주세요.',
} as const;

// 의견 보내기 (#278): 계정 메뉴에서 연다. 불편한 점·바라는 기능을 한 칸에 적어 보낸다.
export function FeedbackDialog({ onClose }: { onClose: () => void }) {
  // ── 입력·상태 ──
  const pathname = usePathname();
  const showToast = useToast();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formId = 'feedback-form';

  // ── 보내기: 빈 글 막기 → 서버 함수 → 토스트 ──
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending) return;
    if (!message.trim()) {
      setError('보낼 내용을 적어 주세요.');
      return;
    }
    setIsSending(true);
    const result = await sendFeedback(message, pathname);
    setIsSending(false);
    if (result !== 'sent') {
      setError(MESSAGES[result]);
      return;
    }
    showToast({ message: '의견을 보냈어요. 고마워요!' });
    onClose();
  };

  return (
    <Dialog
      isOpen
      onClose={onClose}
      closeDisabled={isSending}
      title="의견 보내기"
      description="불편한 점이나 있었으면 하는 기능을 알려 주세요. 보낸 화면 주소와 함께 저장돼요."
      footer={
        <>
          {/* ── 아래 버튼: 취소·보내기 ── */}
          <Button variant="secondary" onClick={onClose} disabled={isSending}>
            취소
          </Button>
          <Button type="submit" form={formId} isLoading={isSending} loadingLabel="보내는 중">
            보내기
          </Button>
        </>
      }
    >
      {/* ── 글 칸 ── */}
      <form id={formId} onSubmit={handleSubmit} noValidate>
        <TextAreaField
          label="의견"
          value={message}
          maxLength={FEEDBACK_MAX_LENGTH}
          rows={5}
          placeholder="예: 원티드 지원이 일부만 들어와요"
          hint={`${message.length} / ${FEEDBACK_MAX_LENGTH}`}
          error={error}
          readOnly={isSending}
          onChange={(event) => {
            setMessage(event.target.value);
            if (error) setError(null);
          }}
        />
      </form>
    </Dialog>
  );
}
