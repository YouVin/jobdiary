'use client';

import { Modal } from '@/components/common/Modal';
import { EditApplicationForm } from '@/components/modal/EditApplicationForm';
import { useApplicationStore } from '@/store/applicationStore';
import { Application } from '@/types/application';

interface EditApplicationModalProps {
  application: Application;
  isOpen: boolean;
  onClose: () => void;
}

export function EditApplicationModal({ application, isOpen, onClose }: EditApplicationModalProps) {
  const clearError = useApplicationStore((state) => state.clearError);

  // X/ESC/오버레이/취소/저장성공 등 모든 닫힘 경로가 이 함수 하나로 모이므로,
  // 여기서 에러를 지우면 어떤 경로로 닫혀도 다음에 열 때 이전 에러가 남아있지 않는다.
  const handleClose = () => {
    clearError();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="지원 수정">
      {/* 열릴 때마다 새로 마운트되어 최신 application 값으로 폼이 초기화됨 */}
      {isOpen && <EditApplicationForm application={application} onClose={handleClose} />}
    </Modal>
  );
}
