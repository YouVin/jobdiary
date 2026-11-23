export const MIN_PASSWORD_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 이메일 형식 검증. 비어있는 경우와 형식이 잘못된 경우를 구분해 더 정확한 안내를 준다.
// 문구는 해요체로, 무엇을 고치면 되는지까지 쓴다 (#202).
export function getEmailError(email: string): string | null {
  if (!email) {
    return '이메일을 입력해 주세요.';
  }
  if (/\s/.test(email)) {
    return '이메일에서 띄어쓰기를 빼 주세요.';
  }
  const parts = email.split('@');
  if (parts.length === 1) return '이메일에 @를 넣어 주세요. 예: name@example.com';
  if (parts.length > 2) return '@는 한 번만 입력해 주세요.';
  if (!parts[0]) return '@ 앞에 이메일 아이디를 입력해 주세요.';
  if (!parts[1]) return '@ 뒤에 도메인을 입력해 주세요. 예: gmail.com';
  if (!EMAIL_PATTERN.test(email)) {
    return '이메일 형식을 확인해 주세요. 예: name@example.com';
  }
  return null;
}

export function getPasswordError(password: string): string | null {
  if (!password) {
    return '비밀번호를 입력해 주세요.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `비밀번호를 ${MIN_PASSWORD_LENGTH}자 이상 입력해 주세요.`;
  }
  return null;
}

// 회원가입 전용: 비밀번호 확인 필드 검증
export function getConfirmPasswordError(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) {
    return '비밀번호를 한 번 더 입력해 주세요.';
  }
  if (password !== confirmPassword) {
    return '비밀번호가 서로 달라요. 다시 확인해 주세요.';
  }
  return null;
}
