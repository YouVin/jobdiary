'use client';

import { useExtensionImportState } from '@/components/import/ExtensionImportProvider';
import { IconButton } from '@/components/ui/IconButton';

// 그 자리 오류 안내 (#203 디자인 시스템 색). 연한 빨강 바탕 + 진한 빨강 글자(4.96:1).
// 처음부터 그려 둔 role=alert 영역에 글자만 넣어 스크린리더가 놓치지 않게 한다.
const NOTICE_CLASS = 'flex items-start justify-between gap-3 rounded-md bg-danger-tint py-2 pr-2 pl-4 text-label text-danger-text';

export function ApplicationErrorNotice({ error }: { error: string | null }) {
  return (
    <div role="alert" className={error ? NOTICE_CLASS : 'sr-only'}>
      {error && <p className="py-1">{error}</p>}
    </div>
  );
}

// 가져오기 실패 안내. 성공은 토스트로 알린다(ExtensionImportProvider).
export function ImportErrorNotice() {
  const { importSummary, dismissImportSummary } = useExtensionImportState();
  const error = importSummary?.error ?? null;
  return (
    <div role="alert" className={error ? NOTICE_CLASS : 'sr-only'}>
      {error && (
        <>
          <p className="py-1">익스텐션에서 가져오지 못했어요: {error}</p>
          <IconButton label="안내 닫기" icon="close" size="sm" onClick={dismissImportSummary} className="text-danger-text hover:text-danger-text" />
        </>
      )}
    </div>
  );
}
