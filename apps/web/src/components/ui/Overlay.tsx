'use client';

import { clsx } from 'clsx';
import { type ReactNode, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '@/components/ui/IconButton';
import { useDialogFocus } from '@/hooks/useDialogFocus';

// 디자인 시스템 겹쳐 뜨는 창 (#201). 뒤는 scrim으로 덮는다.
// 키보드 기준은 useDialogFocus(#156)를 그대로 쓴다: 열 때 안으로 포커스, Tab 순환, Esc 닫기, 닫으면 연 자리로 돌아감.
// - Dialog(가운데 창): 지원 추가·수정처럼 짧은 입력. 폭 520, 모서리 20. 모바일은 아래에서 올라오는 시트.
// - SidePanel(오른쪽 패널): 회사 한 줄을 눌렀을 때 상세. 폭 440, 화면 높이 전체. 모바일은 아래 시트.
// 둘 다 body에 그린다(#293). 연 자리(카드)가 움직임 등으로 transform을 가지면 fixed가 화면이 아니라 그 카드 기준이 되어
// 막(scrim)이 카드 안에만 깔리고 헤더는 밝게 남았다. React 이벤트·context는 portal을 지나도 그대로 이어진다.
function OverlayPortal({ children }: { children: ReactNode }) {
  return typeof document === 'undefined' ? null : createPortal(children, document.body);
}
interface OverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  closeDisabled?: boolean; // 제출 중처럼 닫으면 안 될 때 Esc·바깥 누름·닫기 버튼을 막는다
  footer?: ReactNode; // 아래 버튼 줄 (주요 버튼은 오른쪽)
}

// 모바일 아래 시트의 손잡이 막대 (디자인 시스템 Overlay, #205). 장식이라 읽지 않는다. 640px 이상에서는 없다.
function SheetHandle() {
  return <span aria-hidden="true" className="-mt-3 -mb-2 h-1 w-10 shrink-0 self-center rounded-full bg-muted sm:hidden" />;
}

function OverlayHeader({ titleId, descriptionId, title, description, onClose, closeDisabled }: {
  titleId: string;
  descriptionId: string;
  title: string;
  description?: string;
  onClose: () => void;
  closeDisabled: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1 pt-2">
        <h2 id={titleId} className="text-title-3 text-text-primary">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="text-label text-text-secondary">
            {description}
          </p>
        )}
      </div>
      <IconButton label="닫기" icon="close" onClick={onClose} disabled={closeDisabled} className="-mr-2" />
    </div>
  );
}

export function Dialog({ isOpen, onClose, title, description, children, closeDisabled = false, footer }: OverlayProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(panelRef, { isOpen, onClose, closeDisabled });
  if (!isOpen) return null;

  const requestClose = () => {
    if (!closeDisabled) onClose();
  };

  return (
    <OverlayPortal>
    <div className="fixed inset-0 z-modal flex items-end justify-center bg-scrim sm:items-center sm:px-4" onClick={requestClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90dvh] w-full flex-col gap-5 overflow-y-auto rounded-t-xl bg-surface p-6 shadow-lg focus:outline-none motion-safe:animate-rise sm:max-w-130 sm:rounded-xl"
      >
        <SheetHandle />
        <OverlayHeader titleId={titleId} descriptionId={descriptionId} title={title} description={description} onClose={requestClose} closeDisabled={closeDisabled} />
        <div>{children}</div>
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
    </OverlayPortal>
  );
}

export function SidePanel({ isOpen, onClose, title, description, children, closeDisabled = false, footer }: OverlayProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // 읽기 위주 패널이라 열릴 때 패널 자체에 포커스를 둔다.
  useDialogFocus(panelRef, { isOpen, onClose, closeDisabled, initialFocus: 'container' });
  if (!isOpen) return null;

  const requestClose = () => {
    if (!closeDisabled) onClose();
  };

  return (
    <OverlayPortal>
    <div className="fixed inset-0 z-panel">
      <div className="absolute inset-0 bg-scrim" onClick={requestClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={clsx(
          'absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col gap-5 overflow-y-auto rounded-t-xl bg-surface p-6 shadow-lg focus:outline-none',
          'transition duration-base ease-soft starting:translate-y-4 starting:opacity-0 motion-reduce:transition-none',
          'sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-120 lg:w-130 sm:rounded-none sm:starting:translate-x-4 sm:starting:translate-y-0',
        )}
      >
        <SheetHandle />
        <OverlayHeader titleId={titleId} descriptionId={descriptionId} title={title} description={description} onClose={requestClose} closeDisabled={closeDisabled} />
        <div className="flex-1">{children}</div>
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
    </OverlayPortal>
  );
}
