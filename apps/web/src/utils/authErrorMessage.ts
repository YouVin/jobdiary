import { MIN_PASSWORD_LENGTH } from '@/utils/authValidation';

// 로그인·가입 오류를 사용자 문구로 (#264에서 LoginForm에서 분리). 순수 함수라 테스트로 문구를 고정한다.

export const GOOGLE_FAILED_MESSAGE = '구글 로그인에 실패했어요. 다시 시도해 주세요.';
export const MAIL_UNAVAILABLE_MESSAGE = '지금은 확인 메일을 보낼 수 없어요. Google로 계속하기를 쓰거나 잠시 뒤 다시 해 주세요.';

// 로그인 실패 원인의 "종류" — 특정 종류일 때만 추가 UI(예: 인증 메일 재전송 버튼)를 보여주기 위해 구분한다.
export type AuthErrorKind = 'email-not-confirmed' | 'other';

export interface FriendlyAuthError {
  message: string;
  kind: AuthErrorKind;
}

// Supabase 에러 메시지는 영어·기술적이라 사용자에게는 번역된 문구로 보여준다 (docs/AUTH.md §4). 문구는 해요체 (#202).
export function getFriendlyErrorMessage(rawMessage: string): FriendlyAuthError {
  if (rawMessage.includes('Invalid login credentials')) {
    return { message: '이메일이나 비밀번호가 맞지 않아요.', kind: 'other' };
  }
  if (rawMessage.includes('User already registered')) {
    return { message: '이미 가입한 이메일이에요. 로그인해 주세요.', kind: 'other' };
  }
  if (rawMessage.includes('Password should be at least')) {
    return { message: `비밀번호를 ${MIN_PASSWORD_LENGTH}자 이상 입력해 주세요.`, kind: 'other' };
  }
  if (rawMessage.includes('Unable to validate email address')) {
    return { message: '이메일 형식을 확인해 주세요.', kind: 'other' };
  }
  if (rawMessage.includes('Email not confirmed')) {
    return {
      message: '이메일 인증이 아직 끝나지 않았어요. 메일함에서 확인 메일을 열어 주세요.',
      kind: 'email-not-confirmed',
    };
  }
  // 메일을 보낼 수 없을 때: Supabase 기본 메일은 팀원 주소에만 가고(not authorized) 프로젝트 전체 시간당 몇 통뿐이다(email rate limit).
  // 처음 가입하는 사람도 겪으니 "너무 잦아요"가 아니라 메일 없이 되는 Google 로그인을 알린다.
  if (rawMessage.includes('not authorized') || rawMessage.toLowerCase().includes('email rate limit')) {
    return { message: MAIL_UNAVAILABLE_MESSAGE, kind: 'other' };
  }
  if (rawMessage.includes('For security purposes') || rawMessage.toLowerCase().includes('rate limit')) {
    return { message: '요청이 너무 잦아요. 잠시 뒤 다시 시도해 주세요.', kind: 'other' };
  }
  if (
    rawMessage.includes('Failed to fetch') ||
    rawMessage.includes('NetworkError') ||
    rawMessage.toLowerCase().includes('network')
  ) {
    return { message: '인터넷 연결을 확인하고 다시 시도해 주세요.', kind: 'other' };
  }
  // 매칭 기준을 error.code(예: invalid_credentials, email_not_confirmed) 기반으로 옮기는 방안은
  // docs/AUTH.md §4.2에서 검토됐지만, 이번 Phase 범위를 넘어서 적용하지 않는다. 문자열 부분일치라
  // Supabase가 메시지 문구를 바꾸면 매칭이 조용히 깨질 수 있다는 한계는 남아있다.
  return { message: '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.', kind: 'other' };
}
