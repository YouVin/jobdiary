'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { JOBDIARY_EXTENSION_ID } from '@/constants/extension';
import { JOBDIARY_COLLECT_REQUEST, sanitizeCollectResponse } from '@/lib/extensionImport';
import { ImportSummary, useApplicationStore } from '@/store/applicationStore';
import { useAuthStore } from '@/store/authStore';

// 익스텐션이 설치되지 않았거나 chrome.runtime을 쓸 수 없는 환경(일반 브라우저, SSR, 빌드)에서는
// chrome/chrome.runtime.sendMessage 자체가 없을 수 있으므로 안전하게 확인한다.
function isChromeRuntimeAvailable(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.sendMessage;
}

function failedSummary(error: string): ImportSummary {
  return { addedCount: 0, duplicateCount: 0, skippedCount: 0, error };
}

const noopSubscribe = () => () => {};

// "익스텐션에서 가져오기" 버튼이 쓰는 훅 (docs/INTEGRATION.md §6, pull 방식).
// 웹앱이 chrome.runtime.sendMessage로 익스텐션에 요청을 보내고, 응답(지원내역 배열)을 검증한 뒤
// addApplicationsFromExtension으로 저장한다.
export function useExtensionImport() {
  const addApplicationsFromExtension = useApplicationStore((state) => state.addApplicationsFromExtension);
  const [isRequesting, setIsRequesting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  // 서버에서는 항상 false, 하이드레이션 후 클라이언트에서만 실제 chrome.runtime 존재 여부로 평가 (hydration mismatch 방지).
  const isExtensionAvailable = useSyncExternalStore(
    noopSubscribe,
    isChromeRuntimeAvailable,
    () => false,
  );

  const requestImport = useCallback(async () => {
    if (!isChromeRuntimeAvailable()) {
      setImportSummary(failedSummary('익스텐션이 설치되어 있지 않거나 이 브라우저에서 사용할 수 없습니다.'));
      return;
    }

    if (useAuthStore.getState().status !== 'authenticated') {
      setImportSummary(failedSummary('로그인이 필요합니다.'));
      return;
    }

    setIsRequesting(true);
    try {
      const response = await new Promise<unknown>((resolve, reject) => {
        chrome.runtime.sendMessage(JOBDIARY_EXTENSION_ID, JOBDIARY_COLLECT_REQUEST, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || '익스텐션과 통신하지 못했습니다.'));
            return;
          }
          resolve(result);
        });
      });

      const result = sanitizeCollectResponse(response);

      if (!result) {
        setImportSummary(failedSummary('익스텐션 응답 형식이 올바르지 않습니다.'));
        return;
      }

      if (!result.ok) {
        setImportSummary(failedSummary(result.error));
        return;
      }

      const summary = await addApplicationsFromExtension(result.applications);
      setImportSummary(summary);
    } catch (error) {
      setImportSummary(failedSummary((error as Error).message || '익스텐션과 통신하지 못했습니다.'));
    } finally {
      setIsRequesting(false);
    }
  }, [addApplicationsFromExtension]);

  return {
    requestImport,
    isRequesting,
    isExtensionAvailable,
    importSummary,
    dismissImportSummary: () => setImportSummary(null),
  };
}
