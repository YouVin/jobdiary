'use client';

import { clsx } from 'clsx';
import { useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { useExtensionImportState } from '@/components/import/ExtensionImportProvider';
import { AddApplicationModal } from '@/components/modal/AddApplicationModal';
import { Button } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Menu';
import { signOut } from '@/lib/auth';
import { captureApplicationSession, useApplicationStore } from '@/store/applicationStore';

const NO_EXTENSION_HINT = '크롬 익스텐션을 설치하면 세 사이트의 지원 내역을 한 번에 가져올 수 있어요';

// 헤더 오른쪽 (#203): 익스텐션에서 가져오기(보조) · 지원 추가(주요) · 내 계정 메뉴(계정 설정·로그아웃).
// 모바일(640 미만)에서는 가져오기 버튼 글자를 숨기고 아이콘만 둔다. 접근성 이름은 그대로 남는다.
export function HeaderActions({ className }: { className?: string }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const resetApplications = useApplicationStore((state) => state.resetApplications);
  const { requestImport, isRequesting, isExtensionAvailable } = useExtensionImportState();

  // 로그아웃: signOut이 성공했을 때만 로컬 데이터를 비운다.
  // 실패한 채로 먼저 비우면 세션은 남아있는데 데이터만 사라지는 손실이 생긴다.
  const handleLogout = async () => {
    const context = captureApplicationSession();
    setLogoutError(null);
    const { error } = await signOut();

    if (error) {
      console.error('로그아웃 실패:', error);
      setLogoutError('로그아웃하지 못했어요. 다시 시도해 주세요.');
      return;
    }

    // 보통 인증 이벤트에서 이미 비운다. 늦은 로그아웃 응답으로 새 계정을 초기화하지 않는다.
    if (context?.isCurrent()) resetApplications();
  };

  return (
    <div className={clsx('relative flex items-center gap-2', className)}>
      {/* ── 익스텐션에서 가져오기(좁은 화면은 아이콘만) ── */}
      <Button
        variant="secondary"
        icon="download"
        onClick={requestImport}
        disabled={!isExtensionAvailable}
        isLoading={isRequesting}
        loadingLabel="가져오는 중"
        title={isExtensionAvailable ? undefined : NO_EXTENSION_HINT}
        className="max-sm:w-10 max-sm:px-0"
      >
        <span className="max-sm:sr-only">익스텐션에서 가져오기</span>
      </Button>
      {/* ── 지원 추가 ── */}
      <Button icon="plus" onClick={() => setIsAddModalOpen(true)}>
        지원 추가
      </Button>
      {/* ── 내 계정 메뉴: 계정 설정·로그아웃 ── */}
      <Menu
        label="내 계정"
        trigger={<Icon name="user" className="h-5 w-5" />}
        triggerClassName="grid h-10 w-10 place-items-center rounded-full bg-selected text-text-brand-strong transition-colors duration-fast hover:bg-muted"
        items={[
          { label: '계정 설정', icon: 'settings', href: '/account' },
          { label: '로그아웃', icon: 'logout', onSelect: handleLogout },
        ]}
      />

      {/* ── 로그아웃 실패 알림·지원 추가 창 ── */}
      <p role="alert" className={logoutError ? 'absolute top-full right-0 mt-1 text-label whitespace-nowrap text-danger-text' : 'sr-only'}>
        {logoutError}
      </p>

      <AddApplicationModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}
