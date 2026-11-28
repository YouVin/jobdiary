'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(pointer: fine)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

// 마우스·트랙패드처럼 정밀한 포인터가 있는지(키보드가 있는 PC로 본다). 휴대폰에서는 키보드 단축키 안내를 숨기는 데 쓴다(#310).
// 서버에서는 알 수 없어 PC로 본다.
export function useFinePointer(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => true);
}
