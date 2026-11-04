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
  const status = state.status === 'loading' ? '연결 정보 불러오는 중…'
    : state.status === 'error' ? '연결 정보를 불러오지 못했어요'
      : !state.enabled ? '자동 표시 꺼짐'
        : !state.syncedAt ? '지원 이력 연결 필요'
          : state.count === 0 ? '비교할 수 있는 공고가 없어요' : state.count + '개 공고 연결';

  return (
    <section className="diary-history" aria-label="지원 이력 자동 표시">
      <details>
        <summary className="diary-history-summary">
          <span className="shrink-0 text-diary-secondary">지원 이력 표시</span>
          <span className="flex items-center gap-1 text-diary-secondary"><span role="status" aria-atomic="true">{status}</span><span aria-hidden="true">⌄</span></span>
        </summary>
        <div className="diary-history-details">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="history-display-enabled" className="text-diary-secondary">지원 이력 자동 표시</label>
            <input id="history-display-enabled" type="checkbox" className="h-4 w-4 cursor-pointer accent-diary-ink disabled:cursor-wait"
              checked={state.status === 'ready' && state.enabled} disabled={state.status !== 'ready' || saving}
              onChange={event => onToggle(event.target.checked)} aria-describedby="history-display-description" />
          </div>
          <p id="history-display-description">잡코리아·사람인 공고 제목 옆에 지원 이력을 표시해요.</p>
          {state.status === 'ready' && (state.syncedAt ? <>
            <p>최근 동기화 {new Date(state.syncedAt).toLocaleString('ko-KR')}</p>
            {state.unidentifiedCount > 0 && <p>공고를 식별하지 못한 지원 {state.unidentifiedCount}건은 표시하지 않아요.</p>}
            {state.count === 0 && <p>지원현황에서 수집한 뒤 아래 ‘취준일기로 가져오기’를 눌러 공고 주소를 연결해 주세요.</p>}
          </> : <p>연결된 지원 이력이 없어요. 취준일기에 로그인해 이력을 불러와 주세요.</p>)}
          <button type="button" onClick={onOpenHistory} className="self-start text-diary-ink underline underline-offset-2">취준일기에서 이력 갱신</button>
          {state.status === 'error' && <Button variant="secondary" onClick={onRefresh}>연결 정보 다시 불러오기</Button>}
        </div>
      </details>
      {error && <p role="alert" className="mt-1 text-xs font-medium text-diary-ink">{error}</p>}
    </section>
  );
}
