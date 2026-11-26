'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

// 구글 로그인 취소/실패 시 Supabase가 redirectTo(현재 URL)에 error 정보를 담아 되돌려보낸다.
// implicit 플로우 기본값이라 해시(#error=...)로 오는 경우가 기본이지만, 쿼리(?error=...)로 오는
// 경우도 함께 본다 — supabase-js의 parseParametersFromURL과 동일하게 쿼리가 해시보다 우선한다.
function getOAuthErrorSignal(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  new URLSearchParams(window.location.search).forEach((value, key) => params.set(key, value));
  return params.get('error_description') || params.get('error') || params.get('error_code');
}

// 구글 로그인에서 실패하고 돌아온 경우 한 번만 onError를 부르고, 주소의 오류 정보를 지운다 (#264에서 LoginForm에서 분리).
// 서버 렌더와 첫 화면이 같도록 신호는 useSyncExternalStore로 읽고, 렌더 중 상태 조정으로 한 번만 알린다.
export function useOAuthReturnError(onError: () => void) {
  const oauthErrorSignal = useSyncExternalStore(noopSubscribe, getOAuthErrorSignal, () => null);
  const [hasShown, setHasShown] = useState(false);

  if (oauthErrorSignal && !hasShown) {
    setHasShown(true);
    onError();
  }

  useEffect(() => {
    if (!oauthErrorSignal) {
      return;
    }

    const url = new URL(window.location.href);
    url.hash = '';
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    url.searchParams.delete('error_code');
    window.history.replaceState({}, '', url.toString());
  }, [oauthErrorSignal]);
}
