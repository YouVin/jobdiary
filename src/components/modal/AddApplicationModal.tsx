'use client';

import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { useApplicationStore } from '@/store/applicationStore';
import { PLATFORM_INFO } from '@/constants/platform';
import { STATUS_INFO, STATUS_ORDER } from '@/constants/status';
import { Platform, Status } from '@/types/application';

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLATFORM_OPTIONS = (Object.keys(PLATFORM_INFO) as Platform[]).map((platform) => ({
  value: platform,
  label: PLATFORM_INFO[platform].label,
}));

const STATUS_OPTIONS = STATUS_ORDER.map((status) => ({
  value: status,
  label: STATUS_INFO[status].label,
}));

// 오늘 날짜를 date input 값 형식('YYYY-MM-DD')으로 변환
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const inputClassName =
  'w-full rounded-lg border border-border-strong px-3 py-2 text-[14px] text-text-primary focus:border-brand focus:outline-none';
const labelClassName = 'mb-1 block text-[12px] font-medium text-text-secondary';

export function AddApplicationModal({ isOpen, onClose }: AddApplicationModalProps) {
  const addApplication = useApplicationStore((state) => state.addApplication);

  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [platform, setPlatform] = useState<Platform>('saramin');
  const [status, setStatus] = useState<Status>('applied');
  const [appliedAt, setAppliedAt] = useState(getTodayDateString);

  // 저장 후 다음 입력을 위해 폼 초기화
  const resetForm = () => {
    setCompany('');
    setPosition('');
    setPlatform('saramin');
    setStatus('applied');
    setAppliedAt(getTodayDateString());
  };

  const handleSave = () => {
    if (!company.trim()) {
      return;
    }

    addApplication({
      company: company.trim(),
      position: position.trim(),
      platform,
      status,
      appliedAt: new Date(appliedAt).toISOString(),
    });

    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="지원 추가">
      <div className="flex flex-col gap-3">
        <div>
          <label className={labelClassName}>회사명 *</label>
          <input
            type="text"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="예: 카카오"
            className={inputClassName}
          />
        </div>

        <div>
          <label className={labelClassName}>공고명</label>
          <input
            type="text"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            placeholder="예: 프론트엔드 개발자"
            className={inputClassName}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClassName}>플랫폼</label>
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value as Platform)}
              className={inputClassName}
            >
              {PLATFORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClassName}>상태</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as Status)}
              className={inputClassName}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClassName}>지원일</label>
          <input
            type="date"
            value={appliedAt}
            onChange={(event) => setAppliedAt(event.target.value)}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border-strong px-4 py-2 text-[14px] font-medium text-text-secondary transition-colors hover:bg-column"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!company.trim()}
          className="rounded-lg bg-brand px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          저장
        </button>
      </div>
    </Modal>
  );
}
