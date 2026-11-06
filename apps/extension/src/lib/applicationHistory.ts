import { HISTORY_PROTOCOL_VERSION, parseHistoryCache, type HistoryCache, type HistoryRequest, type HistoryResponse } from '@jobdiary/shared';

export const HISTORY_STORAGE_PREFIX = 'jobdiary:application-history:v1:';
export const HISTORY_WEBAPP_ORIGIN = import.meta.env.MODE === 'production'
  ? 'https://jobdiary.vercel.app' : 'http://localhost:3000';

// origin마다 별도 키를 사용한다. 재수집 슬롯 교체/초기화는 이 저장소를 건드리지 않는다.
export function historyStorageKey(origin: string): string { return HISTORY_STORAGE_PREFIX + origin; }
let pending: Promise<unknown> = Promise.resolve();
export function applyHistoryRequest(origin: string, request: HistoryRequest): Promise<HistoryResponse> {
  const result = pending.then(async (): Promise<HistoryResponse> => {
    try {
      const syncedAt = new Date().toISOString();
      if (request.type === 'JOBDIARY_HISTORY_CLEAR') {
        await chrome.storage.local.remove(historyStorageKey(origin));
        return { ok: true, version: HISTORY_PROTOCOL_VERSION, syncedAt, entryCount: 0 };
      }
      const cache: HistoryCache = { ...request.snapshot, version: HISTORY_PROTOCOL_VERSION, syncedAt };
      await chrome.storage.local.set({ [historyStorageKey(origin)]: cache });
      return { ok: true, version: HISTORY_PROTOCOL_VERSION, syncedAt, entryCount: cache.entries.length };
    } catch { return { ok: false, error: 'history-storage-failed' }; }
  });
  pending = result.catch(() => undefined);
  return result;
}
export async function getApplicationHistory(origin = HISTORY_WEBAPP_ORIGIN): Promise<HistoryCache | null> {
  const key = historyStorageKey(origin);
  return parseHistoryCache((await chrome.storage.local.get(key))[key]);
}
