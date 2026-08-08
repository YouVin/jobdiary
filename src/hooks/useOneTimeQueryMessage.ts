'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

function findMatchedParam(paramNames: string[]): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  return paramNames.find((name) => params.get(name) === '1') ?? null;
}

// URL 쿼리에 일회성 신호(예: ?passwordUpdated=1)가 있으면 대응하는 안내 메시지를 반환하고,
// 새로고침해도 다시 뜨지 않도록 신호를 URL에서 제거한다. 서버에서는 항상 없음으로 시작해
// 하이드레이션 후에만 실제 URL을 읽는다(hydration mismatch 방지) — DashboardClient의 ?import=1,
// LoginForm의 ?passwordUpdated=1 패턴과 동일한 기법을 여러 신호에 재사용할 수 있게 일반화했다.
export function useOneTimeQueryMessage(paramMessages: Record<string, string>): string | null {
  const paramNames = Object.keys(paramMessages);

  const matchedParam = useSyncExternalStore(
    noopSubscribe,
    () => findMatchedParam(paramNames),
    () => null,
  );

  // 렌더 중 상태를 맞추는 방식(React 공식 권장 패턴) — effect 안에서 setState를 직접 호출하지 않는다.
  const [message, setMessage] = useState<string | null>(null);
  const [handledParam, setHandledParam] = useState<string | null>(null);

  if (matchedParam && matchedParam !== handledParam) {
    setHandledParam(matchedParam);
    setMessage(paramMessages[matchedParam]);
  }

  // 실제 부수효과(URL 정리)만 담당 — setState 없음.
  useEffect(() => {
    if (!matchedParam) {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete(matchedParam);
    window.history.replaceState({}, '', url.toString());
  }, [matchedParam]);

  return message;
}
