'use client';

import { Modal } from '@/components/common/Modal';
import { EditApplicationForm } from '@/components/modal/EditApplicationForm';
import { Application } from '@/types/application';

interface EditApplicationModalProps {
  application: Application;
  isOpen: boolean;
  onClose: () => void;
}

export function EditApplicationModal({ application, isOpen, onClose }: EditApplicationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="지원 수정">
      {/* 열릴 때마다 새로 마운트되어 최신 application 값으로 폼이 초기화됨 */}
      {isOpen && <EditApplicationForm application={application} onClose={onClose} />}
    </Modal>
  );
}
