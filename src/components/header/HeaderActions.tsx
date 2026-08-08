'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AddApplicationModal } from '@/components/modal/AddApplicationModal';
import { signOut } from '@/lib/auth';
import { useApplicationStore } from '@/store/applicationStore';

export function HeaderActions() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const resetApplications = useApplicationStore((state) => state.resetApplications);

  // 로그아웃: signOut이 성공했을 때만 로컬 데이터를 비운다.
  // 실패한 채로 먼저 비우면 세션은 남아있는데 데이터만 사라지는 손실이 생긴다.
  const handleLogout = async () => {
    setLogoutError(null);
    const { error } = await signOut();

    if (error) {
      console.error('로그아웃 실패:', error);
      setLogoutError('로그아웃에 실패했습니다. 다시 시도해주세요.');
      return;
    }

    resetApplications();
  };

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <div className="flex flex-col items-end gap-2 md:flex-row md:items-center">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-page"
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
            className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-page"
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

          <Link
            href="/account"
            className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-page"
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
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            계정 설정
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-page"
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

        {logoutError && <p className="text-[11px] text-status-rejected">{logoutError}</p>}
      </div>

      <AddApplicationModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </>
  );
}
