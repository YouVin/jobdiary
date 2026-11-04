import type { HistoryDisplayState } from '../useHistoryDisplay';
import { Button } from './Button';

interface HistoryDisplayPanelProps {
  state: HistoryDisplayState;
  saving: boolean;
  error: string | null;
  onToggle: (enabled: boolean) => void;
  onRefresh: () => void;
  onOpenHistory: () => void;
}

export function HistoryDisplayPanel({ state, saving, error, onToggle, onRefresh, onOpenHistory }: HistoryDisplayPanelProps) {
  const ready = state.status === 'ready';
  const status = state.status === 'loading' ? '불러오는 중'
    : state.status === 'error' ? '확인 필요'
      : !state.enabled ? '꺼짐'
        : !state.syncedAt ? '연결 필요'
          : state.count === 0 ? '연결 공고 없음' : state.count + '개 공고 연결';
  const description = state.status === 'loading' ? '지원 이력을 확인하고 있어요.'
    : state.status === 'error' ? '연결 정보를 다시 불러와 주세요.'
      : !state.syncedAt ? '로그인 후 지원 이력을 연결하세요.'
        : state.count === 0 ? '수집 후 ‘가져오기’로 공고를 연결하세요.'
          : '잡코리아·사람인 공고에 표시해요.';
  const syncedAt = ready && state.syncedAt ? new Date(state.syncedAt) : null;

  return (
    <section className="diary-history" aria-label="지원 이력 자동 표시">
      <details>
        <summary className="diary-history-summary">
          <span className="shrink-0 font-medium">지원 이력 설정</span>
          <span className="diary-history-summary-end"><span role="status" aria-atomic="true">{status}</span>
            <img src="/icons/chevron-down.svg" alt="" aria-hidden="true" className="diary-history-chevron" />
          </span>
        </summary>
        <div className="diary-history-details">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="history-display-enabled" className="cursor-pointer text-diary-ink"><span className="sr-only">지원 이력 </span>자동 표시</label>
            <input id="history-display-enabled" type="checkbox" className="h-4 w-4 cursor-pointer accent-diary-ink disabled:cursor-wait"
              checked={ready && state.enabled} disabled={!ready || saving}
              onChange={event => onToggle(event.target.checked)} aria-describedby="history-display-description" />
          </div>
          <p id="history-display-description">{description}</p>
          {ready && syncedAt && <p className="diary-history-meta">
            <time dateTime={state.syncedAt ?? undefined} title={syncedAt.toLocaleString('ko-KR')}>갱신 {syncedAt.toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</time>
            {state.unidentifiedCount > 0 && <span title="공고 주소를 확인하지 못한 지원은 사이트에 표시하지 않아요.">미확인 {state.unidentifiedCount}건 제외</span>}
          </p>}
          {ready && <Button variant="compact" onClick={onOpenHistory}>{state.syncedAt ? '이력 갱신' : '취준일기에서 연결'}</Button>}
          {state.status === 'error' && <Button variant="compact" onClick={onRefresh}>다시 확인</Button>}
        </div>
      </details>
      {error && <p role="alert" className="mt-1 text-xs font-medium text-diary-ink">{error}</p>}
    </section>
  );
}
