'use client';

import { useExtensionImportState } from '@/components/import/ExtensionImportProvider';
import { useHiringProcessFill } from '@/hooks/useHiringProcessFill';

// 로그인한 화면 어디서든 공고 전형 절차를 배경에서 채운다(#295). 그리는 것은 없다.
// 익스텐션에서 가져오는 동안은 멈춘다(같은 채용 사이트에 겹쳐 요청하지 않게, #299).
export function HiringProcessFiller() {
  const { isRequesting } = useExtensionImportState();
  useHiringProcessFill({ isPaused: isRequesting });
  return null;
}
