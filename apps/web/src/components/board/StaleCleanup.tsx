'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog } from '@/components/ui/Overlay';
import { useToast } from '@/components/ui/Toast';
import { useApplicationStore } from '@/store/applicationStore';
import { STALE_DAYS, type WaitingItem } from '@/utils/waitingList';

// 소식 없는 지원 한 번에 정리 (#277). 지원 후 STALE_DAYS일이 지나도 지원 완료인 곳을 골라 탈락으로 옮긴다.
// 처음엔 모두 골라 두고, 남길 곳만 끄면 된다. 옮긴 뒤 토스트의 "되돌리기"로 지원 완료로 되돌린다.
export function StaleCleanup({ staleItems }: { staleItems: WaitingItem[] }) {
  // ── 상태 ──
  const updateStatus = useApplicationStore((state) => state.updateStatus);
  const showToast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (staleItems.length === 0) return null;

  // ── 처리 함수: 열기·고르기·옮기기·되돌리기 ──
  const open = () => {
    setSelected(new Set(staleItems.map((item) => item.application.id)));
    setError(null);
    setIsOpen(true);
  };
  const toggle = (id: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const moveAll = async (ids: string[], status: 'rejected' | 'applied') => {
    const done: string[] = [];
    for (const id of ids) {
      if (await updateStatus(id, status)) done.push(id);
    }
    return done;
  };
  const confirm = async () => {
    if (isSaving || selected.size === 0) return;
    setIsSaving(true);
    const ids = [...selected];
    const moved = await moveAll(ids, 'rejected');
    setIsSaving(false);
    if (moved.length < ids.length) {
      setError(`${ids.length - moved.length}건을 옮기지 못했어요. 잠시 뒤 다시 해 주세요.`);
      if (moved.length === 0) return;
    }
    setIsOpen(false);
    showToast({
      message: `${moved.length}건을 탈락으로 옮겼어요`,
      actionLabel: '되돌리기',
      onAction: () => {
        void moveAll(moved, 'applied').then((restored) => showToast({ message: `${restored.length}건을 지원 완료로 되돌렸어요` }));
      },
    });
  };

  return (
    <>
      {/* ── 여는 버튼 ── */}
      <Button variant="text" size="sm" onClick={open}>
        소식 없는 {staleItems.length}건 정리
      </Button>

      {/* ── 고르는 창: 목록(모두 골라 둠) → 탈락으로 옮기기 ── */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        closeDisabled={isSaving}
        title="소식 없는 지원 정리"
        description={`지원하고 ${STALE_DAYS}일이 넘도록 소식이 없는 곳이에요. 남겨 둘 곳은 체크를 꺼 주세요.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)} disabled={isSaving}>
              취소
            </Button>
            <Button onClick={() => void confirm()} disabled={selected.size === 0} isLoading={isSaving} loadingLabel="옮기는 중">
              {selected.size}건 탈락으로 옮기기
            </Button>
          </>
        }
      >
        <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {staleItems.map(({ application, waitDays }) => (
            <li key={application.id} className="rounded-md px-2 py-2 hover:bg-subtle">
              <Checkbox checked={selected.has(application.id)} disabled={isSaving} onChange={(event) => toggle(application.id, event.target.checked)}>
                <span className="font-semibold text-text-primary">{application.company}</span>
                <span className="text-text-secondary">
                  {application.position ? ` ${application.position}` : ''} ({waitDays}일째)
                </span>
              </Checkbox>
            </li>
          ))}
        </ul>
        <p role="alert" className={error ? 'text-label text-danger-text' : 'sr-only'}>
          {error}
        </p>
      </Dialog>
    </>
  );
}
