'use client';

import { useState } from 'react';
import { AddApplicationModal } from '@/components/modal/AddApplicationModal';
import { signOut } from '@/lib/auth';
import { useApplicationStore } from '@/store/applicationStore';

export function HeaderActions() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const resetApplications = useApplicationStore((state) => state.resetApplications);

  // 로그아웃: 로컬 상태부터 비운 뒤 세션을 끊는다. 이후 이동은 AuthGuard가 상태 변화를 감지해 처리한다.
  const handleLogout = async () => {
    resetApplications();
    await signOut();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
          복사
        </button>

        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5 15.4 17.5" />
            <path d="M15.4 6.5 8.6 10.5" />
          </svg>
          공유
        </button>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          지원추가
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          로그아웃
        </button>
      </div>

      <AddApplicationModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </>
  );
}
