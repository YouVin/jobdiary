import { clsx } from 'clsx';
import { getPasswordStrength, PasswordStrength } from '@/utils/passwordStrength';

interface PasswordStrengthMeterProps {
  password: string;
}

// 강도별 막대 색/문구 — 기존 상태 색 토큰을 재사용한다 (하드코딩 색상 금지).
const PASSWORD_STRENGTH_INFO: Record<
  PasswordStrength,
  { label: string; barClassName: string; textClassName: string; filledSegments: number }
> = {
  weak: { label: '약함', barClassName: 'bg-status-rejected', textClassName: 'text-status-rejected', filledSegments: 1 },
  medium: { label: '보통', barClassName: 'bg-status-screening', textClassName: 'text-status-screening', filledSegments: 2 },
  strong: { label: '강함', barClassName: 'bg-status-offer', textClassName: 'text-status-offer', filledSegments: 3 },
};

// 회원가입/새 비밀번호 설정 폼에서 재사용하는 비밀번호 강도 표시(3단 막대 + 문구)
export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = getPasswordStrength(password);
  const info = PASSWORD_STRENGTH_INFO[strength];

  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((segmentIndex) => (
          <div
            key={segmentIndex}
            className={clsx('h-1 flex-1 rounded-full', segmentIndex < info.filledSegments ? info.barClassName : 'bg-column')}
          />
        ))}
      </div>
      <p className={clsx('mt-1 text-[11px] font-medium', info.textClassName)}>비밀번호 강도: {info.label}</p>
    </div>
  );
}
