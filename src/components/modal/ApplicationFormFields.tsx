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

export const inputClassName =
  'w-full rounded-lg border border-border-strong px-3 py-2 text-[14px] text-text-primary focus:border-brand focus:outline-none';
export const labelClassName = 'mb-1 block text-[12px] font-medium text-text-secondary';

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
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className={labelClassName}>회사명 *</label>
        <input
          type="text"
          value={company}
          onChange={(event) => onCompanyChange(event.target.value)}
          placeholder="예: 카카오"
          className={inputClassName}
        />
      </div>

      <div>
        <label className={labelClassName}>공고명</label>
        <input
          type="text"
          value={position}
          onChange={(event) => onPositionChange(event.target.value)}
          placeholder="예: 프론트엔드 개발자"
          className={inputClassName}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClassName}>플랫폼</label>
          <select
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
          <label className={labelClassName}>상태</label>
          <select
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
        <label className={labelClassName}>지원일</label>
        <input
          type="date"
          value={appliedAt}
          onChange={(event) => onAppliedAtChange(event.target.value)}
          className={inputClassName}
        />
      </div>

      {onInterviewDateChange && (
        <div>
          <label className={labelClassName}>면접일</label>
          <input
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
