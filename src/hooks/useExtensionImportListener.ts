'use client';

import { useEffect, useState } from 'react';
import { JOBDIARY_EXTENSION_ID } from '@/constants/extension';
import {
  isJobdiaryCollectMessage,
  isValidCollectPayload,
  JobdiaryCollectResponse,
} from '@/lib/extensionImport';
import { ImportSummary, useApplicationStore } from '@/store/applicationStore';
import { useAuthStore } from '@/store/authStore';

// 익스텐션(jobdiary-extension)이 chrome.runtime.onMessageExternal로 보내는 수집 데이터를 받아
// addApplicationsFromExtension으로 저장하고, 결과를 화면에 배너로 보여주기 위해 반환한다.
// docs/INTEGRATION.md §6 참고. 로그인 상태에서만 리스너를 등록하고, 벗어나면 즉시 해제한다.
export function useExtensionImportListener() {
  const status = useAuthStore((state) => state.status);
  const addApplicationsFromExtension = useApplicationStore((state) => state.addApplicationsFromExtension);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    // 익스텐션이 설치되지 않았거나 chrome.runtime을 쓸 수 없는 환경(일반 브라우저, SSR, 빌드)에서는
    // chrome/chrome.runtime.onMessageExternal 자체가 없을 수 있으므로 안전하게 스킵한다.
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessageExternal) {
      return;
    }

    const handleMessage = (
      message: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: JobdiaryCollectResponse) => void,
    ): boolean | undefined => {
      // ② 웹앱 → 익스텐션 방향 검증: 고정된 익스텐션 ID가 아니면 무시 (docs/INTEGRATION.md §6.2)
      if (sender.id !== JOBDIARY_EXTENSION_ID) {
        return;
      }

      // 알려진 메시지 타입이 아니면 무시
      if (!isJobdiaryCollectMessage(message)) {
        return;
      }

      // 메시지 내용은 신뢰하지 않고 최소한의 형식(필수 필드)을 검증한다
      if (!isValidCollectPayload(message.payload)) {
        sendResponse({ ok: false, error: '잘못된 데이터 형식입니다.' });
        return;
      }

      // 리스너는 인증 상태일 때만 등록되지만, 등록 이후 세션이 만료되는 순간을 대비해 한 번 더 확인한다.
      if (useAuthStore.getState().status !== 'authenticated') {
        sendResponse({ ok: false, error: '로그인이 필요합니다.' });
        return;
      }

      addApplicationsFromExtension(message.payload).then((summary) => {
        setImportSummary(summary);
        sendResponse({
          ok: !summary.error,
          summary: {
            addedCount: summary.addedCount,
            duplicateCount: summary.duplicateCount,
            skippedCount: summary.skippedCount,
          },
          error: summary.error ?? undefined,
        });
      });

      return true; // 비동기로 sendResponse를 호출하므로 채널을 열어둔다
    };

    chrome.runtime.onMessageExternal.addListener(handleMessage);
    return () => chrome.runtime.onMessageExternal.removeListener(handleMessage);
  }, [status, addApplicationsFromExtension]);

  return {
    importSummary,
    dismissImportSummary: () => setImportSummary(null),
  };
}
