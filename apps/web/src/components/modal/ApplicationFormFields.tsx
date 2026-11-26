import { SelectField, TextField } from '@/components/ui/TextField';
import { PLATFORM_INFO } from '@/constants/platform';
import { STATUS_INFO, STATUS_ORDER } from '@/constants/status';
import type { Platform, Status } from '@/types/application';
import { type ApplicationFormErrors, fieldId } from '@/utils/applicationFormValidation';

const PLATFORM_OPTIONS = (Object.keys(PLATFORM_INFO) as Platform[]).map((platform) => ({
  value: platform,
  label: PLATFORM_INFO[platform].label,
}));

const STATUS_OPTIONS = STATUS_ORDER.map((status) => ({
  value: status,
  label: STATUS_INFO[status].label,
}));

interface ApplicationFormFieldsProps {
  idPrefix: string; // 칸 id 앞부분. 제출 때 첫 오류 칸을 찾아 포커스한다 (`${idPrefix}-company`)
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
  deadlineAt: string;
  onDeadlineAtChange: (value: string) => void;
  interviewDate?: string;
  onInterviewDateChange?: (value: string) => void;
  errors?: ApplicationFormErrors;
  disabled?: boolean;
}

// 지원 추가·수정 칸 (#205): 디자인 시스템 입력칸·선택칸. 꼭 넣어야 하는 칸은 이름표에 "(필수)"를 글자로 적는다.
// 오류는 칸 아래에 보이고, 제출 때 부모가 첫 오류 칸으로 포커스를 옮긴다.
export function ApplicationFormFields({
  idPrefix,
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
  deadlineAt,
  onDeadlineAtChange,
  interviewDate,
  onInterviewDateChange,
  errors = {},
  disabled = false,
}: ApplicationFormFieldsProps) {
  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4">
      <legend className="sr-only">지원 정보</legend>
      <TextField
        id={fieldId(idPrefix, 'company')}
        label="회사명 (필수)"
        value={company}
        onChange={(event) => onCompanyChange(event.target.value)}
        placeholder="예: 가람소프트"
        aria-required="true"
        error={errors.company}
      />
      <TextField
        id={fieldId(idPrefix, 'position')}
        label="공고명"
        value={position}
        onChange={(event) => onPositionChange(event.target.value)}
        placeholder="예: 프론트엔드 개발자"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id={fieldId(idPrefix, 'platform')}
          label="지원 경로"
          value={platform}
          onChange={(event) => onPlatformChange(event.target.value as Platform)}
          options={PLATFORM_OPTIONS}
        />
        <SelectField
          id={fieldId(idPrefix, 'status')}
          label="단계"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as Status)}
          options={STATUS_OPTIONS}
        />
      </div>
      <TextField
        id={fieldId(idPrefix, 'appliedAt')}
        label="지원일 (필수)"
        type="date"
        value={appliedAt}
        onChange={(event) => onAppliedAtChange(event.target.value)}
        aria-required="true"
        error={errors.appliedAt}
      />
      <TextField
        id={fieldId(idPrefix, 'deadlineAt')}
        label="공고 마감일"
        type="date"
        value={deadlineAt}
        onChange={(event) => onDeadlineAtChange(event.target.value)}
        hint="상시 채용이면 비워 두세요. 마감 다음 날에도 지원 완료면 자동으로 탈락 처리돼요."
        error={errors.deadlineAt}
      />
      {onInterviewDateChange && (
        <TextField
          id={fieldId(idPrefix, 'interviewDate')}
          label="면접일"
          type="date"
          value={interviewDate ?? ''}
          onChange={(event) => onInterviewDateChange(event.target.value)}
          error={errors.interviewDate}
        />
      )}
    </fieldset>
  );
}
