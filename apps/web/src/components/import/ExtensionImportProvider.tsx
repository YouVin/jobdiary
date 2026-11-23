'use client';

import { createContext, type ReactNode, useContext, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useExtensionImport } from '@/hooks/useExtensionImport';
import type { ImportSummary } from '@/store/applicationStore';

type ExtensionImportState = ReturnType<typeof useExtensionImport>;

const ExtensionImportContext = createContext<ExtensionImportState | null>(null);

// 가져오기 결과 한 줄 (해요체 과거형). 새로 넣은 것, 다른 사이트와 겹친 것, 이미 있어서 건너뛴 것을 나눠 말한다.
export function importSummaryMessage(summary: ImportSummary): string {
  const parts: string[] = [];
  if (summary.duplicateCount > 0) parts.push(`다른 사이트와 겹친 ${summary.duplicateCount}건 포함`);
  if (summary.skippedCount > 0) parts.push(`이미 있던 ${summary.skippedCount}건은 건너뛰었어요`);
  const head = summary.addedCount > 0 ? `지원 ${summary.addedCount}건을 가져왔어요` : '새로 가져온 지원이 없어요';
  return parts.length > 0 ? `${head} · ${parts.join(' · ')}` : head;
}

// 익스텐션 가져오기 상태를 보호 화면(홈·지원 보드·계정) 전체가 함께 쓴다 (#203).
// 헤더의 "익스텐션에서 가져오기" 버튼과 홈 요약 카드의 "마지막 가져오기" 줄이 같은 상태를 본다.
// AuthGuard 안에 두어 계정이 바뀌면 새로 만들어진다(마지막 가져오기 시각도 계정별).
// - 성공하면 토스트로 알린다. 실패는 토스트가 아니라 본문 맨 위 안내(ImportErrorNotice)로 보여준다.
// - 익스텐션이 "취준일기 열기"로 붙인 ?import=1을 보면 한 번 자동으로 가져온다.
export function ExtensionImportProvider({ children }: { children: ReactNode }) {
  const state = useExtensionImport();
  const showToast = useToast();
  const { requestImport, importSummary } = state;

  // 처리 전에 먼저 URL에서 신호를 지워, 새로고침해도 다시 실행되지 않게 한다(중복 방지).
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('import') !== '1') return;
    url.searchParams.delete('import');
    window.history.replaceState({}, '', url.toString());
    requestImport();
  }, [requestImport]);

  useEffect(() => {
    if (importSummary && !importSummary.error) showToast({ message: importSummaryMessage(importSummary) });
  }, [importSummary, showToast]);

  return <ExtensionImportContext.Provider value={state}>{children}</ExtensionImportContext.Provider>;
}

export function useExtensionImportState(): ExtensionImportState {
  const state = useContext(ExtensionImportContext);
  if (!state) throw new Error('ExtensionImportProvider 안에서만 쓸 수 있어요.');
  return state;
}
