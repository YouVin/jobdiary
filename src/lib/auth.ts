import type { AuthChangeEvent, AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

// 회원가입 (Confirm email이 꺼져 있어서 성공하면 바로 로그인 상태가 됨)
export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data.user, session: data.session, error };
}

// 로그인
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data.user, session: data.session, error };
}

// 구글 로그인/회원가입 (하나로 겸함 — provider 특성상 가입/로그인을 구분하지 않는다).
// 성공 시 브라우저 전체가 구글로 이동하므로 이 Promise는 보통 resolve되기 전에 페이지를 벗어난다.
// 여기서 받는 error는 리다이렉트 자체가 시작되지 못한 경우(네트워크 오류 등)만 해당하고,
// 사용자가 구글 화면에서 취소/실패한 경우는 redirectTo로 되돌아온 뒤 URL에 담겨오므로 별도로 처리한다
// (docs/AUTH.md §2.4, §4.1 "OAuth 로그인 실패/취소").
export async function signInWithGoogle(redirectTo: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  return { error };
}

// 로그아웃
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// 비밀번호 재설정 이메일 발송. redirectTo는 반드시 /update-password를 가리켜야 한다 (docs/AUTH.md §6.3.5).
export async function resetPasswordForEmail(email: string, redirectTo: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { error };
}

// 복구 세션(authStore status==='recovering') 상태에서 새 비밀번호로 갱신
export async function updatePassword(password: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({ password });
  return { error };
}

// 회원가입 확인 메일 재전송 (이메일 미인증으로 로그인이 막혔을 때)
export async function resendSignUpEmail(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  return { error };
}

// 현재 세션 조회 (비로그인 상태면 session이 null)
export async function getSession(): Promise<{ session: Session | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

// 로그인/로그아웃 등 인증 상태 변화 구독. 반환된 함수를 호출하면 구독이 해제된다 (useEffect의 cleanup으로 바로 사용 가능)
export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);

  return () => subscription.unsubscribe();
}
