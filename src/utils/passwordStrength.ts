export type PasswordStrength = 'weak' | 'medium' | 'strong';

// 외부 라이브러리 없이 계산하는 간단한 휴리스틱.
// 기준: 8자 미만이거나 문자 종류(소문자/대문자/숫자/특수문자)가 1개 이하면 약함,
// 8자 이상 + 2종류면 보통, 8자 이상 + 3종류 이상이면 강함.
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return 'weak';
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const varietyCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

  if (password.length < 8 || varietyCount <= 1) {
    return 'weak';
  }
  if (varietyCount === 2) {
    return 'medium';
  }
  return 'strong';
}
