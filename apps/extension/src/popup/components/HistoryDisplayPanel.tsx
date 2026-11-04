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
  return (
    <section className="flex flex-col gap-2 border-b border-card-border px-4 py-3" aria-label="지원 이력 자동 표시">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="history-display-enabled" className="text-sm font-medium text-text-primary">지원 이력 자동 표시</label>
        <input id="history-display-enabled" type="checkbox" className="h-4 w-4 cursor-pointer accent-brand disabled:cursor-wait"
          checked={state.status === 'ready' && state.enabled} disabled={state.status !== 'ready' || saving}
          onChange={event => onToggle(event.target.checked)} aria-describedby="history-display-description" />
      </div>
      <p id="history-display-description" className="text-xs text-text-secondary">잡코리아·사람인 공고의 저장된 지원 이력을 표시해요.</p>
      <div role="status" aria-atomic="true" className="text-xs text-text-muted">
        {state.status === 'loading' && <p>연결 정보 불러오는 중…</p>}
        {state.status === 'error' && <p>지원 이력 정보를 불러오지 못했어요.</p>}
        {state.status === 'ready' && (state.syncedAt ? <>
          <p>{state.count}개 공고 연결 · 최근 동기화 {new Date(state.syncedAt).toLocaleString('ko-KR')}</p>
          {state.unidentifiedCount > 0 && <p>공고를 식별하지 못한 지원 {state.unidentifiedCount}건은 표시하지 않아요.</p>}
          <p>최신 이력은 취준일기를 열어 갱신하세요.</p>
        </> : <p>연결된 지원 이력이 없어요. 취준일기에 로그인해 이력을 불러와 주세요.</p>)}
      </div>
      <button type="button" onClick={onOpenHistory} className="self-start text-xs text-brand underline hover:text-brand-hover">취준일기에서 이력 갱신</button>
      {state.status === 'error' && <Button variant="secondary" onClick={onRefresh}>연결 정보 다시 불러오기</Button>}
      {error && <p role="alert" className="text-xs text-status-rejected">{error}</p>}
    </section>
  );
}
