export const JOB_PLATFORMS = ['saramin', 'jobkorea', 'wanted'] as const;
export type JobPlatform = typeof JOB_PLATFORMS[number];
export type ApplicationStatus = 'applied' | 'screening' | 'interview' | 'interviewed' | 'offer' | 'rejected' | 'canceled';
export const COLLECT_MESSAGE_TYPE = 'JOBDIARY_COLLECT' as const;
export const HISTORY_SYNC_TYPE = 'JOBDIARY_HISTORY_SYNC' as const;
export const HISTORY_CLEAR_TYPE = 'JOBDIARY_HISTORY_CLEAR' as const;
export const HISTORY_PROTOCOL_VERSION = 1 as const;
export const MAX_HISTORY_ENTRIES = 20_000;

export interface PostingReference { platform: JobPlatform; postingId: string; url: string }
export interface HistoryEntry {
  platform: JobPlatform;
  postingId: string;
  // 지원 진행 단계가 아니라 과거 지원 사실이다. 불합격/마감된 이력도 applied에 포함한다.
  state: 'applied' | 'canceled';
}
export interface HistorySnapshot {
  ownerKey: string; // 사용자 UUID의 SHA-256. 인증 정보가 아니며 이메일/원본 UUID는 보내지 않는다.
  entries: HistoryEntry[];
  unidentifiedCount: number;
}
export type HistoryRequest =
  | { type: typeof HISTORY_SYNC_TYPE; version: typeof HISTORY_PROTOCOL_VERSION; snapshot: HistorySnapshot }
  | { type: typeof HISTORY_CLEAR_TYPE; version: typeof HISTORY_PROTOCOL_VERSION };
export type HistoryResponse =
  | { ok: true; version: typeof HISTORY_PROTOCOL_VERSION; syncedAt: string; entryCount: number }
  | { ok: false; error: string };
export interface HistoryCache extends HistorySnapshot {
  version: typeof HISTORY_PROTOCOL_VERSION;
  syncedAt: string;
}

const POSTING_ID = /^[1-9]\d{0,19}$/;
const OWNER_KEY = /^[a-f0-9]{64}$/;
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function postingKey(entry: Pick<HistoryEntry, 'platform' | 'postingId'>): string {
  return entry.platform + ':' + entry.postingId;
}

// 수집 슬롯의 externalId는 지원 ID다. 공고 식별에 재사용하지 않고 URL에서만 공고 ID를 얻는다.
export function getPostingReference(value: unknown): PostingReference | null {
  if (typeof value !== 'string' || value.length > 4096) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname;
    if (['www.jobkorea.co.kr', 'jobkorea.co.kr'].includes(host)) {
      const id = url.pathname.match(/^\/Recruit\/GI_Read\/([1-9]\d{0,19})\/?$/i)?.[1];
      return id ? { platform: 'jobkorea', postingId: id, url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/' + id } : null;
    }
    if (['www.saramin.co.kr', 'saramin.co.kr', 'm.saramin.co.kr'].includes(host)) {
      if (!['/zf_user/jobs/relay/view', '/job-search/view'].includes(url.pathname.replace(/\/$/, ''))) return null;
      const ids = url.searchParams.getAll('rec_idx');
      const id = ids.length === 1 ? ids[0] : '';
      return POSTING_ID.test(id) ? { platform: 'saramin', postingId: id, url: 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=' + id } : null;
    }
    if (['www.wanted.co.kr', 'wanted.co.kr'].includes(host)) {
      const id = url.pathname.match(/^\/wd\/([1-9]\d{0,19})\/?$/)?.[1];
      return id ? { platform: 'wanted', postingId: id, url: 'https://www.wanted.co.kr/wd/' + id } : null;
    }
  } catch { /* 확인할 수 없는 URL은 비교하지 않는다. */ }
  return null;
}

export function buildHistoryEntries(applications: ReadonlyArray<{
  platform: string; status: ApplicationStatus; url?: string;
}>): { entries: HistoryEntry[]; unidentifiedCount: number } {
  const entries = new Map<string, HistoryEntry>();
  let unidentifiedCount = 0;
  for (const app of applications) {
    const reference = getPostingReference(app.url);
    if (!reference || reference.platform !== app.platform) { unidentifiedCount++; continue; }
    const entry: HistoryEntry = { platform: reference.platform, postingId: reference.postingId,
      state: app.status === 'canceled' ? 'canceled' : 'applied' };
    const key = postingKey(entry);
    // 여러 지원 기록이 있으면 취소 외의 지원 사실을 우선한다.
    if (!entries.has(key) || entry.state === 'applied') entries.set(key, entry);
  }
  return { entries: [...entries.values()].sort((a, b) => postingKey(a).localeCompare(postingKey(b))), unidentifiedCount };
}

export function parseHistorySnapshot(value: unknown): HistorySnapshot | null {
  if (!record(value) || typeof value.ownerKey !== 'string' || !OWNER_KEY.test(value.ownerKey)
    || !Number.isSafeInteger(value.unidentifiedCount) || (value.unidentifiedCount as number) < 0
    || !Array.isArray(value.entries) || value.entries.length > MAX_HISTORY_ENTRIES) return null;
  const entries: HistoryEntry[] = [];
  const keys = new Set<string>();
  for (const entry of value.entries) {
    if (!record(entry) || !JOB_PLATFORMS.includes(entry.platform as JobPlatform)
      || typeof entry.postingId !== 'string' || !POSTING_ID.test(entry.postingId)
      || !['applied', 'canceled'].includes(entry.state as string)) return null;
    const normalized: HistoryEntry = { platform: entry.platform as JobPlatform, postingId: entry.postingId,
      state: entry.state as HistoryEntry['state'] };
    const key = postingKey(normalized);
    if (keys.has(key)) return null;
    keys.add(key);
    entries.push(normalized);
  }
  return { ownerKey: value.ownerKey, entries, unidentifiedCount: value.unidentifiedCount as number };
}

export function parseHistoryRequest(value: unknown): HistoryRequest | null {
  if (!record(value) || value.version !== HISTORY_PROTOCOL_VERSION) return null;
  if (value.type === HISTORY_CLEAR_TYPE) return { type: HISTORY_CLEAR_TYPE, version: HISTORY_PROTOCOL_VERSION };
  if (value.type !== HISTORY_SYNC_TYPE) return null;
  const snapshot = parseHistorySnapshot(value.snapshot);
  return snapshot ? { type: HISTORY_SYNC_TYPE, version: HISTORY_PROTOCOL_VERSION, snapshot } : null;
}
export function parseHistoryCache(value: unknown): HistoryCache | null {
  if (!record(value) || value.version !== HISTORY_PROTOCOL_VERSION || typeof value.syncedAt !== 'string'
    || !Number.isFinite(Date.parse(value.syncedAt))) return null;
  const snapshot = parseHistorySnapshot(value);
  return snapshot ? { ...snapshot, version: HISTORY_PROTOCOL_VERSION, syncedAt: value.syncedAt } : null;
}
