'use client';

import { clsx } from 'clsx';
import {
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
  useState,
} from 'react';
import { Icon } from '@/components/common/Icon';
import { IconButton } from '@/components/ui/IconButton';

// 디자인 시스템 입력칸 (#201). 테두리형 하나만 쓴다.
// - 이름표(label)는 칸 위에 항상 보인다. 안내 글자(placeholder)를 이름표 대신 쓰지 않는다.
// - 도움말·오류 문구는 칸 아래에 두고 aria-describedby로 연결한다. 오류면 aria-invalid.
// - 오류 자리는 비어 있을 때도 알림 영역(role=status)으로 남겨 둔다. 처음부터 있던 영역이라야
//   글자가 들어올 때 스크린리더가 놓치지 않고 읽는다(#202). 비어 있으면 자리를 차지하지 않는다.
// - 오류 문구는 무엇이 잘못됐고 어떻게 고치는지 쓴다 ("이메일 형식을 확인해 주세요").
// 높이를 뺀 공통 모양. 한 줄 칸은 높이 52(h-13), 여러 줄 칸은 글 길이만큼(같은 속성 클래스를 겹쳐 쓰지 않으려고 나눴다, #205).
const FIELD_BASE =
  'w-full rounded-md border border-line-input bg-surface px-4 text-body text-text-primary placeholder:text-text-secondary transition-colors duration-fast focus:border-line-focus focus:ring-1 focus:ring-line-focus focus:outline-none aria-invalid:border-danger aria-invalid:ring-1 aria-invalid:ring-danger disabled:cursor-not-allowed disabled:border-line-divider disabled:bg-subtle disabled:text-text-disabled';
export const inputClassName = `h-13 ${FIELD_BASE}`;

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  hint?: string;
  error?: string | null;
  labelAction?: ReactNode; // 이름표 오른쪽 링크 (예: 비밀번호 찾기)
  endAdornment?: ReactNode; // 칸 안 오른쪽 버튼 (예: 비밀번호 보기)
  ref?: Ref<HTMLInputElement>; // React 19: ref도 일반 prop으로 input까지 내려간다 (오류 칸에 포커스할 때)
}

// 입력칸·선택칸·여러 줄 칸이 함께 쓰는 이름표·도움말·오류 연결 (#205).
function useFieldIds(id: string | undefined, hint: string | undefined, error: string | null | undefined, describedBy: string | undefined) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  // 화면이 이미 넘긴 설명 id가 있으면 뒤에 붙인다.
  // 오류가 있으면 도움말은 숨기므로 설명 id에서도 뺀다. 없는 id를 가리키면 스크린리더가 설명을 못 읽는다(#202).
  const isHintShown = Boolean(hint) && !error;
  const describedByIds = [describedBy, isHintShown ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return { inputId, hintId, errorId, isHintShown, describedByIds };
}

interface FieldFrameProps {
  inputId: string;
  hintId: string;
  errorId: string;
  label: string;
  hint?: string;
  isHintShown: boolean;
  error?: string | null;
  labelAction?: ReactNode;
  className?: string;
  children: ReactNode;
}

function FieldFrame({ inputId, hintId, errorId, label, hint, isHintShown, error, labelAction, className, children }: FieldFrameProps) {
  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-label font-semibold text-text-secondary">
          {label}
        </label>
        {labelAction}
      </div>
      {children}
      {isHintShown && (
        <p id={hintId} className="text-label text-text-secondary">
          {hint}
        </p>
      )}
      <p id={errorId} role="status" aria-atomic="true" className={error ? 'text-label text-danger-text' : 'sr-only'}>
        {error}
      </p>
    </div>
  );
}

export function TextField({ label, hint, error, labelAction, endAdornment, id, className, 'aria-describedby': describedBy, ...rest }: TextFieldProps) {
  const ids = useFieldIds(id, hint, error, describedBy);
  return (
    <FieldFrame {...ids} label={label} hint={hint} error={error} labelAction={labelAction} className={className}>
      <div className="relative">
        <input
          id={ids.inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedByIds}
          className={clsx(inputClassName, endAdornment && 'pr-14')}
          {...rest}
        />
        {endAdornment && <div className="absolute top-1 right-1">{endAdornment}</div>}
      </div>
    </FieldFrame>
  );
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: string;
  hint?: string;
  error?: string | null;
  options: { value: string; label: string }[];
}

// 선택칸 (#205): 입력칸과 같은 모양(높이 52·테두리)에 오른쪽 아래 화살표. 브라우저 기본 선택 목록을 그대로 써서
// 키보드(화살표·첫 글자)와 화면 읽기 프로그램 동작을 따로 만들지 않는다.
export function SelectField({ label, hint, error, options, id, className, 'aria-describedby': describedBy, ...rest }: SelectFieldProps) {
  const ids = useFieldIds(id, hint, error, describedBy);
  return (
    <FieldFrame {...ids} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <select
          id={ids.inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedByIds}
          className={clsx(inputClassName, 'cursor-pointer appearance-none pr-12')}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-text-secondary" />
      </div>
    </FieldFrame>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string | null;
  ref?: Ref<HTMLTextAreaElement>;
}

// 여러 줄 칸 (#205): 기록 남기기처럼 긴 글. 글 길이만큼 늘어나고(field-sizing), 최소 세 줄 높이.
export function TextAreaField({ label, hint, error, id, className, 'aria-describedby': describedBy, ...rest }: TextAreaFieldProps) {
  const ids = useFieldIds(id, hint, error, describedBy);
  return (
    <FieldFrame {...ids} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={ids.inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedByIds}
        className={clsx(FIELD_BASE, 'field-sizing-content min-h-24 resize-none py-3')}
        {...rest}
      />
    </FieldFrame>
  );
}

type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'endAdornment'>;

// 비밀번호 칸: 보기 버튼이 칸 안 오른쪽에 있다.
// 버튼 이름은 "○○ 보기"로 고정하고 켜짐/꺼짐은 눌림 상태(aria-pressed)로만 알린다.
// 이름까지 바꾸면 스크린리더가 "숨기기, 눌림"처럼 두 신호를 거꾸로 읽는다(#202).
export function PasswordField({ id, label, disabled, ...props }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [isVisible, setIsVisible] = useState(false);
  return (
    <TextField
      {...props}
      id={inputId}
      label={label}
      disabled={disabled}
      type={isVisible ? 'text' : 'password'}
      endAdornment={
        <IconButton
          label={`${label} 보기`}
          icon={isVisible ? 'eye-off' : 'eye'}
          aria-pressed={isVisible}
          aria-controls={inputId}
          disabled={disabled}
          onClick={() => setIsVisible((value) => !value)}
        />
      }
    />
  );
}

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label: string; // 화면에는 숨기지만 스크린리더가 읽는 이름
}

// 검색칸: 높이 40, 회색 채움, 테두리 없음. 이름표는 숨기되 접근성 이름으로 남긴다.
export function SearchInput({ label, id, className, ...rest }: SearchInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div
      className={clsx(
        'flex h-10 items-center gap-2 rounded-md bg-subtle px-3 text-text-secondary focus-within:ring-2 focus-within:ring-focus-ring',
        className,
      )}
    >
      <Icon name="search" className="h-5 w-5" />
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="search"
        className="min-w-0 flex-1 bg-transparent text-body text-text-primary placeholder:text-text-secondary focus:outline-none"
        {...rest}
      />
    </div>
  );
}
