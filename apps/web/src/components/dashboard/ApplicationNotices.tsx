import type { ImportSummary } from '@/store/applicationStore';

export function ApplicationErrorNotice({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-3 py-2 text-small text-status-rejected">
      {error}
    </div>
  );
}

interface ImportSummaryNoticeProps {
  summary: ImportSummary | null;
  onDismiss: () => void;
}

export function ImportSummaryNotice({ summary, onDismiss }: ImportSummaryNoticeProps) {
  if (!summary) return null;
  return (
    <div
      className={
        summary.error
          ? 'flex items-start justify-between gap-3 rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-3 py-2 text-small text-status-rejected'
          : 'flex items-start justify-between gap-3 rounded-lg border border-brand/20 bg-brand-tint px-3 py-2 text-small text-brand-text'
      }
    >
      <span>
        {summary.error
          ? `익스텐션 수집 데이터 저장 실패: ${summary.error}`
          : `익스텐션에서 ${summary.addedCount}건 추가, ${summary.duplicateCount}건 다른 플랫폼 중복, ${summary.skippedCount}건 기존 내역으로 건너뛰었습니다.`}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="알림 닫기"
        className="shrink-0 text-label font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        닫기
      </button>
    </div>
  );
}
