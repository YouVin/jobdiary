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

// 로그아웃
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
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
