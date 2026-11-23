'use client';

import Link from 'next/link';
import { useState } from 'react';
import { buttonClassName } from '@/components/common/buttonStyles';
import { Icon } from '@/components/common/Icon';
import { AddApplicationModal } from '@/components/modal/AddApplicationModal';
import { signOut } from '@/lib/auth';
import { captureApplicationSession, useApplicationStore } from '@/store/applicationStore';

export function HeaderActions() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const resetApplications = useApplicationStore((state) => state.resetApplications);

  // 로그아웃: signOut이 성공했을 때만 로컬 데이터를 비운다.
  // 실패한 채로 먼저 비우면 세션은 남아있는데 데이터만 사라지는 손실이 생긴다.
  const handleLogout = async () => {
    const context = captureApplicationSession();
    setLogoutError(null);
    const { error } = await signOut();

    if (error) {
      console.error('로그아웃 실패:', error);
      setLogoutError('로그아웃에 실패했습니다. 다시 시도해주세요.');
      return;
    }

    // 보통 인증 이벤트에서 이미 비운다. 늦은 로그아웃 응답으로 새 계정을 초기화하지 않는다.
    if (context?.isCurrent()) resetApplications();
  };

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        {/* 모바일은 한 줄에 맞추기 위해 계정 설정·로그아웃을 아이콘만 보여준다. 접근성 이름은 aria-label로 유지한다. */}
        <div className="flex items-center gap-2">
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
            aria-label="계정 설정"
            title="계정 설정"
            className={buttonClassName('secondary')}
          >
            <Icon name="settings" className="h-4 w-4" />
            <span className="hidden md:inline">계정 설정</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="로그아웃"
            title="로그아웃"
            className={buttonClassName('secondary')}
          >
            <Icon name="logout" className="h-4 w-4" />
            <span className="hidden md:inline">로그아웃</span>
          </button>
        </div>

        {logoutError && <p className="text-legacy-caption text-status-rejected">{logoutError}</p>}
      </div>

      <AddApplicationModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </>
  );
}
