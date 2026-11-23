'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/common/Icon';

// 디자인 시스템 메뉴 (#203). 버튼을 누르면 아래에 몇 가지 이동·동작을 펼친다 (예: 계정 메뉴).
// 공개(disclosure) 방식: 버튼은 aria-expanded·aria-controls로 열림을 알리고, 펼친 목록은 평범한 링크·버튼이다.
// - 열면 첫 항목으로 포커스, Esc는 닫고 버튼으로 포커스를 돌려준다.
// - 바깥을 누르거나 Tab으로 목록을 벗어나면 닫는다.
// - 흰 판 + 그림자 md, 모서리 md, 층 z-dropdown. 항목 높이 40.
export interface MenuItem {
  label: string;
  icon?: IconName;
  href?: string; // 주면 링크, 없으면 버튼
  onSelect?: () => void;
}

interface MenuProps {
  label: string; // 버튼의 접근성 이름 (예: 내 계정)
  trigger: ReactNode; // 버튼 안 모양 (아이콘 등)
  triggerClassName?: string;
  items: MenuItem[];
}

const ITEM_CLASS =
  'flex h-10 w-full cursor-pointer items-center gap-3 rounded-sm px-3 text-left text-body text-text-primary transition-colors duration-fast hover:bg-subtle focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring';

export function Menu({ label, trigger, triggerClassName, items }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // 열리면 첫 항목으로 포커스. 바깥 누름은 닫기.
  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [isOpen]);

  const close = (returnFocus: boolean) => {
    setIsOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          event.stopPropagation();
          close(true);
        }
      }}
      onBlur={(event) => {
        // 포커스가 메뉴 밖으로 나가면(Tab) 닫는다.
        if (isOpen && !rootRef.current?.contains(event.relatedTarget as Node | null)) setIsOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((value) => !value)}
        className={clsx(
          'cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      <ul
        ref={listRef}
        id={menuId}
        hidden={!isOpen}
        className="absolute top-full right-0 z-dropdown mt-2 flex min-w-44 flex-col rounded-md bg-surface p-1 shadow-md motion-safe:animate-rise"
      >
        {items.map((item) => {
          const content = (
            <>
              {item.icon && <Icon name={item.icon} className="h-5 w-5 text-text-secondary" />}
              {item.label}
            </>
          );
          return (
            <li key={item.label}>
              {item.href ? (
                <Link href={item.href} className={ITEM_CLASS} onClick={() => close(false)}>
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  className={ITEM_CLASS}
                  onClick={() => {
                    close(true);
                    item.onSelect?.();
                  }}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
