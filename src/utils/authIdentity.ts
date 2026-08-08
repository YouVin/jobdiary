import type { User } from '@supabase/supabase-js';

// 이메일+비밀번호로 가입/연동된 적 있는 계정인지 확인한다. 구글 등 소셜 로그인으로만 가입한 계정은
// 확인할 비밀번호 자체가 없다 (docs/AUTH.md §6.5.7 엣지케이스 3).
export function hasPasswordIdentity(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }
  return (user.identities ?? []).some((identity) => identity.provider === 'email');
}
