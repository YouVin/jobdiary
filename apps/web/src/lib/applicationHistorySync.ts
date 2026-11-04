import { buildHistoryEntries, HISTORY_CLEAR_TYPE, HISTORY_PROTOCOL_VERSION, HISTORY_SYNC_TYPE, MAX_HISTORY_ENTRIES, type HistoryRequest, type HistoryResponse } from '@jobdiary/shared';
import { JOBDIARY_EXTENSION_ID } from '@/constants/extension';
import { fetchApplicationHistory } from '@/lib/applicationsApi';
import { useApplicationStore } from '@/store/applicationStore';
import { useAuthStore } from '@/store/authStore';

interface HistorySyncStatus {
  state: 'idle' | 'syncing' | 'synced' | 'unavailable' | 'error';
  lastSyncedAt: string | null;
  error: string | null;
}
let status: HistorySyncStatus = { state: 'idle', lastSyncedAt: null, error: null };
export function getApplicationHistorySyncStatus(): HistorySyncStatus { return { ...status }; }

// 기존 가져오기와 별도 채널이다. 미설치/구버전/응답 중단은 지원 데이터 저장을 실패시키지 않는다.
export function sendHistoryMessage(request: HistoryRequest): Promise<HistoryResponse> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      reject(new Error('extension-unavailable')); return;
    }
    const timer = setTimeout(() => reject(new Error('history-response-timeout')), 5000);
    try {
      chrome.runtime.sendMessage(JOBDIARY_EXTENSION_ID, request, (response: unknown) => {
        clearTimeout(timer);
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) { reject(new Error('extension-unavailable')); return; }
        if (!response || typeof response !== 'object') { reject(new Error('history-unsupported')); return; }
        const value = response as Partial<HistoryResponse> & { version?: number; syncedAt?: string; entryCount?: number };
        if (value.ok !== true || value.version !== HISTORY_PROTOCOL_VERSION || typeof value.syncedAt !== 'string'
          || !Number.isFinite(Date.parse(value.syncedAt)) || !Number.isSafeInteger(value.entryCount)) {
          reject(new Error('history-sync-failed')); return;
        }
        resolve(value as HistoryResponse);
      });
    } catch { clearTimeout(timer); reject(new Error('extension-unavailable')); }
  });
}

async function ownerKey(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

// 이 구독은 AuthProvider에 한 번 연결한다. 종료는 캐시를 지우지 않으며 로그아웃 이벤트가 지운다.
export function startApplicationHistorySync(options: { debounceMs?: number; retryDelays?: number[] } = {}): () => void {
  let active = true;
  let revision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let retries = 0;
  let clearedSession: number | null = null;
  let observed: { userId: string | null; version: number; ready: boolean; applications: unknown; auth: string } | null = null;
  let pending: Promise<unknown> = Promise.resolve();
  const delays = options.retryDelays ?? [1000, 5000, 30000];

  function current(expected: number): boolean { return active && expected === revision; }

  async function reconcile(expected: number): Promise<void> {
    if (!current(expected) || useAuthStore.getState().status === 'loading') return;
    const initial = useApplicationStore.getState();
    const isCurrent = () => current(expected) && useApplicationStore.getState().sessionVersion === initial.sessionVersion;
    try {
      // 같은 origin의 여러 탭에서 보낸 snapshot과 로그아웃 정리도 직렬화한다.
      const work = async () => {
        if (!isCurrent()) return;
        status = { ...status, state: 'syncing', error: null };
        if (clearedSession !== initial.sessionVersion) {
          await sendHistoryMessage({ type: HISTORY_CLEAR_TYPE, version: HISTORY_PROTOCOL_VERSION });
          if (!isCurrent()) return;
          clearedSession = initial.sessionVersion;
          status = { state: 'idle', lastSyncedAt: null, error: null };
        }
        if (!initial.userId || !initial.historyReady || useAuthStore.getState().status !== 'authenticated') return;
        const key = await ownerKey(initial.userId);
        if (!isCurrent()) return;
        // 다른 탭이 가진 오래된 배열로 덮지 않도록 전송 직전 같은 계정의 DB를 다시 읽는다.
        const latest = await fetchApplicationHistory({ userId: initial.userId, isCurrent });
        if (!isCurrent()) return;
        if (latest.error) throw latest.error;
        const snapshot = { ownerKey: key, ...buildHistoryEntries(latest.applications) };
        if (snapshot.entries.length > MAX_HISTORY_ENTRIES) throw new Error('history-too-large');
        const response = await sendHistoryMessage({ type: HISTORY_SYNC_TYPE, version: HISTORY_PROTOCOL_VERSION, snapshot });
        if (!isCurrent() || !response.ok) return;
        retries = 0;
        status = { state: 'synced', lastSyncedAt: response.syncedAt, error: null };
      };
      if (typeof navigator !== 'undefined' && navigator.locks) {
        await navigator.locks.request('jobdiary-extension-history', work);
      } else { await work(); }
    } catch (error) {
      if (!isCurrent()) return;
      const message = error instanceof Error ? error.message : 'history-sync-failed';
      status = { ...status, state: message === 'extension-unavailable' || message === 'history-unsupported' ? 'unavailable' : 'error', error: message };
      if (retries < delays.length) {
        const delay = delays[retries++];
        timer = setTimeout(() => enqueue(expected), delay);
      }
    }
  }
  function enqueue(expected: number) {
    if (!current(expected)) return;
    pending = pending.then(() => reconcile(expected)).catch(() => undefined);
  }
  function observe(force = false) {
    if (!active) return;
    const state = useApplicationStore.getState();
    const auth = useAuthStore.getState().status;
    if (!force && observed?.userId === state.userId && observed.version === state.sessionVersion
      && observed.ready === state.historyReady && observed.applications === state.applications && observed.auth === auth) return;
    const sessionChanged = observed?.version !== state.sessionVersion || observed?.auth !== auth;
    observed = { userId: state.userId, version: state.sessionVersion, ready: state.historyReady, applications: state.applications, auth };
    const expected = ++revision;
    retries = 0;
    clearTimeout(timer);
    timer = setTimeout(() => enqueue(expected), sessionChanged ? 0 : (options.debounceMs ?? 150));
  }
  const unsubscribeApplications = useApplicationStore.subscribe(() => observe());
  const unsubscribeAuth = useAuthStore.subscribe(() => observe());
  const onFocus = () => observe(true);
  const onVisibility = () => { if (document.visibilityState === 'visible') observe(true); };
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
  }
  observe();
  return () => {
    active = false;
    clearTimeout(timer);
    unsubscribeApplications();
    unsubscribeAuth();
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    }
  };
}
