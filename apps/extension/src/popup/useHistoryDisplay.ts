import { useCallback, useEffect, useRef, useState } from 'react';
import { HISTORY_WEBAPP_ORIGIN, historyStorageKey } from '@/lib/applicationHistory';
import { HISTORY_DISPLAY_KEY, readHistoryDisplayInfo, setHistoryDisplayEnabled } from '@/lib/historyDisplay';

export type HistoryDisplayState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; enabled: boolean; count: number; unidentifiedCount: number; syncedAt: string | null };

export function useHistoryDisplay() {
  const [state, setState] = useState<HistoryDisplayState>({ status: 'loading' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++request.current;
    try {
      const { cache, enabled } = await readHistoryDisplayInfo();
      if (!mounted.current || id !== request.current) return;
      setState({ status: 'ready', enabled, count: cache?.entries.filter(entry => entry.platform !== 'wanted').length ?? 0,
        unidentifiedCount: cache?.unidentifiedCount ?? 0, syncedAt: cache?.syncedAt ?? null });
    } catch { if (mounted.current && id === request.current) setState({ status: 'error' }); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const key = historyStorageKey(HISTORY_WEBAPP_ORIGIN);
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && (changes[key] || changes[HISTORY_DISPLAY_KEY])) void refresh();
    };
    chrome.storage.onChanged.addListener(onChanged);
    void refresh();
    return () => { mounted.current = false; request.current++; chrome.storage.onChanged.removeListener(onChanged); };
  }, [refresh]);
  const setEnabled = useCallback(async (enabled: boolean) => {
    setSaving(true); setError(null);
    try { await setHistoryDisplayEnabled(enabled); await refresh(); }
    catch { if (mounted.current) setError('자동 표시 설정을 저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { if (mounted.current) setSaving(false); }
  }, [refresh]);
  return { state, saving, error, refresh, setEnabled };
}
