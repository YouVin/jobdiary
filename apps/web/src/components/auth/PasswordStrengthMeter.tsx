import { clsx } from 'clsx';
import { getPasswordStrength, PasswordStrength } from '@/utils/passwordStrength';

interface PasswordStrengthMeterProps {
  password: string;
  id?: string;
  className?: string;
}

// 강도별 막대 색/문구 (#202 디자인 시스템 색). 마리골드는 오늘·D-day 전용이라 쓰지 않는다.
// 색만으로 구분하지 않도록 칸 수와 글자(약함·보통·강함)를 함께 보여준다.
const PASSWORD_STRENGTH_INFO: Record<
  PasswordStrength,
  { label: string; barClassName: string; textClassName: string; filledSegments: number }
> = {
  weak: { label: '약함', barClassName: 'bg-danger', textClassName: 'text-danger-text', filledSegments: 1 },
  medium: { label: '보통', barClassName: 'bg-action-primary', textClassName: 'text-text-brand', filledSegments: 2 },
  strong: { label: '강함', barClassName: 'bg-success', textClassName: 'text-success-text', filledSegments: 3 },
};

// 회원가입/새 비밀번호 설정 폼에서 재사용하는 비밀번호 강도 표시(3단 막대 + 문구)
export function PasswordStrengthMeter({ password, id, className }: PasswordStrengthMeterProps) {
  const strength = getPasswordStrength(password);
  const info = PASSWORD_STRENGTH_INFO[strength];

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <div aria-hidden="true" className="flex gap-1">
        {[0, 1, 2].map((segmentIndex) => (
          <div
            key={segmentIndex}
            className={clsx('h-1 flex-1 rounded-full', segmentIndex < info.filledSegments ? info.barClassName : 'bg-muted')}
          />
        ))}
      </div>
      <p id={id} role="status" className={clsx('text-label font-semibold', info.textClassName)}>비밀번호 강도: {info.label}</p>
    </div>
  );
}
