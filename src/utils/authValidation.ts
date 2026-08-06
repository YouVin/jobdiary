export const MIN_PASSWORD_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 이메일 형식 검증. 비어있는 경우와 형식이 잘못된 경우를 구분해 더 정확한 안내를 준다.
export function getEmailError(email: string): string | null {
  if (!email) {
    return '이메일을 입력해주세요.';
  }
  if (!EMAIL_PATTERN.test(email)) {
    return '올바른 이메일 형식을 입력해주세요.';
  }
  return null;
}

export function getPasswordError(password: string): string | null {
  if (!password) {
    return '비밀번호를 입력해주세요.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
  }
  return null;
}

// 회원가입 전용: 비밀번호 확인 필드 검증
export function getConfirmPasswordError(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) {
    return '비밀번호를 한 번 더 입력해주세요.';
  }
  if (password !== confirmPassword) {
    return '비밀번호가 일치하지 않습니다.';
  }
  return null;
}
