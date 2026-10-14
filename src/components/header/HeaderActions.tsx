'use client';

import Link from 'next/link';
import { useState } from 'react';
import { buttonClassName } from '@/components/common/buttonStyles';
import { Icon } from '@/components/common/Icon';
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
            onClick={() => setIsAddModalOpen(true)}
            className={buttonClassName('primary')}
          >
            <Icon name="plus" className="h-4 w-4" />
            지원추가
          </button>

          <Link
            href="/account"
            className={buttonClassName('secondary')}
          >
            <Icon name="settings" className="h-4 w-4" />
            계정 설정
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className={buttonClassName('secondary')}
          >
            <Icon name="logout" className="h-4 w-4" />
            로그아웃
          </button>
        </div>

        {logoutError && <p className="text-caption text-status-rejected">{logoutError}</p>}
      </div>

      <AddApplicationModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </>
  );
}
