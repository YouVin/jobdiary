import { useId } from 'react';
import { inputClassName, labelClassName } from '@/components/common/formStyles';
import { PLATFORM_INFO } from '@/constants/platform';
import { STATUS_INFO, STATUS_ORDER } from '@/constants/status';
import { Platform, Status } from '@/types/application';

const PLATFORM_OPTIONS = (Object.keys(PLATFORM_INFO) as Platform[]).map((platform) => ({
  value: platform,
  label: PLATFORM_INFO[platform].label,
}));

const STATUS_OPTIONS = STATUS_ORDER.map((status) => ({
  value: status,
  label: STATUS_INFO[status].label,
}));

interface ApplicationFormFieldsProps {
  company: string;
  onCompanyChange: (value: string) => void;
  position: string;
  onPositionChange: (value: string) => void;
  platform: Platform;
  onPlatformChange: (value: Platform) => void;
  status: Status;
  onStatusChange: (value: Status) => void;
  appliedAt: string;
  onAppliedAtChange: (value: string) => void;
  interviewDate?: string;
  onInterviewDateChange?: (value: string) => void;
}

export function ApplicationFormFields({
  company,
  onCompanyChange,
  position,
  onPositionChange,
  platform,
  onPlatformChange,
  status,
  onStatusChange,
  appliedAt,
  onAppliedAtChange,
  interviewDate,
  onInterviewDateChange,
}: ApplicationFormFieldsProps) {
  const fieldId = useId();
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor={`${fieldId}-company`} className={labelClassName}>회사명 *</label>
        <input
          id={`${fieldId}-company`}
          type="text"
          value={company}
          onChange={(event) => onCompanyChange(event.target.value)}
          placeholder="예: 카카오"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor={`${fieldId}-position`} className={labelClassName}>공고명</label>
        <input
          id={`${fieldId}-position`}
          type="text"
          value={position}
          onChange={(event) => onPositionChange(event.target.value)}
          placeholder="예: 프론트엔드 개발자"
          className={inputClassName}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${fieldId}-platform`} className={labelClassName}>플랫폼</label>
          <select
            id={`${fieldId}-platform`}
            value={platform}
            onChange={(event) => onPlatformChange(event.target.value as Platform)}
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
          <label htmlFor={`${fieldId}-status`} className={labelClassName}>상태</label>
          <select
            id={`${fieldId}-status`}
            value={status}
            onChange={(event) => onStatusChange(event.target.value as Status)}
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
        <label htmlFor={`${fieldId}-appliedAt`} className={labelClassName}>지원일</label>
        <input
          id={`${fieldId}-appliedAt`}
          type="date"
          value={appliedAt}
          onChange={(event) => onAppliedAtChange(event.target.value)}
          className={inputClassName}
        />
      </div>

      {onInterviewDateChange && (
        <div>
          <label htmlFor={`${fieldId}-interviewDate`} className={labelClassName}>면접일</label>
          <input
            id={`${fieldId}-interviewDate`}
            type="date"
            value={interviewDate ?? ''}
            onChange={(event) => onInterviewDateChange(event.target.value)}
            className={inputClassName}
          />
        </div>
      )}
    </div>
  );
}
