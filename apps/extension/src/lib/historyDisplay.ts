import { parseHistoryCache, type HistoryCache } from '@jobdiary/shared';
import { HISTORY_WEBAPP_ORIGIN, historyStorageKey } from './applicationHistory';

export const HISTORY_DISPLAY_KEY = 'jobdiary:history-display:v1';
export function isHistoryDisplayEnabled(value: unknown): boolean {
  return !(value && typeof value === 'object' && 'enabled' in value && value.enabled === false);
}
export async function readHistoryDisplayInfo(): Promise<{ enabled: boolean; cache: HistoryCache | null }> {
  const key = historyStorageKey(HISTORY_WEBAPP_ORIGIN);
  const stored = await chrome.storage.local.get([HISTORY_DISPLAY_KEY, key]);
  return { enabled: isHistoryDisplayEnabled(stored[HISTORY_DISPLAY_KEY]), cache: parseHistoryCache(stored[key]) };
}
export async function setHistoryDisplayEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [HISTORY_DISPLAY_KEY]: { enabled } });
}
