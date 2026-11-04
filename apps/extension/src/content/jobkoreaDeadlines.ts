import type { ScrapedApplication } from '../types/application';
import type { DeadlineSummary } from '../lib/messages';
import { normalizeDeadline } from '../lib/dateNormalize';
import { JOBKOREA_POSTING_SELECTORS } from './selectors/jobkorea';

const MAX_POSTINGS = 10;
const REQUEST_TIMEOUT_MS = 4000;
const MAX_HTML_LENGTH = 2_000_000;

export function jobkoreaPosting(href: string | undefined): { id: string, url: string } | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href);
    if (url.protocol !== 'https:' || !['www.jobkorea.co.kr', 'jobkorea.co.kr'].includes(url.hostname)
      || url.username || url.password || url.port) return undefined;
    const match = url.pathname.match(/^\/Recruit\/GI_Read\/(\d+)\/?$/i);
    if (!match) return undefined;
    // 추적 쿼리·fragment를 제거한다. 임의 경로나 다른 호스트는 요청하지 않는다.
    return { id: match[1], url: `${url.origin}/Recruit/GI_Read/${match[1]}` };
  }
  catch { return undefined; }
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readJobkoreaPostingDeadline(root: ParentNode, expectedId: string): string | undefined {
  const description = root.querySelector(JOBKOREA_POSTING_SELECTORS.description)?.getAttribute('content') ?? '';
  // 실물 상시채용 공고도 validThrough가 있으므로 반드시 표시용 마감일과 대조한다.
  const rawDate = description.match(/(?:^|,\s*)마감일\s*:\s*(\d{4}\.\d{2}\.\d{2})\s*$/)?.[1];
  const displayed = normalizeDeadline(rawDate);
  if (!displayed) return undefined;
  const dates = new Set<string>();
  for (const script of root.querySelectorAll(JOBKOREA_POSTING_SELECTORS.structuredData)) {
    let data: unknown;
    try { data = JSON.parse(script.textContent ?? ''); }
    catch { continue; }
    const entries = Array.isArray(data) ? data : record(data) && Array.isArray(data['@graph']) ? data['@graph'] : [data];
    for (const entry of entries) {
      if (!record(entry) || entry['@type'] !== 'JobPosting') continue;
      const identifier = entry.identifier;
      if (!record(identifier) || identifier.name !== 'JobKorea' || String(identifier.value) !== expectedId
        || typeof entry.url !== 'string' || jobkoreaPosting(entry.url)?.id !== expectedId) continue;
      const validThrough = entry.validThrough;
      if (typeof validThrough !== 'string'
        || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/.test(validThrough)) return undefined;
      const date = normalizeDeadline(validThrough.slice(0, 10));
      if (!date || date !== displayed) return undefined;
      dates.add(date);
    }
  }
  return dates.size === 1 ? displayed : undefined;
}

async function fetchDeadline(posting: { id: string, url: string }): Promise<{ date?: string, failed: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(posting.url, { credentials: 'omit', redirect: 'error', signal: controller.signal });
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return { failed: true };
    const html = await response.text();
    if (html.length > MAX_HTML_LENGTH) return { failed: true };
    const root = new DOMParser().parseFromString(html, 'text/html');
    return { date: readJobkoreaPostingDeadline(root, posting.id), failed: false };
  }
  catch { return { failed: true }; }
  finally { clearTimeout(timer); }
}

export async function supplementJobkoreaDeadlines(rows: ScrapedApplication[]): Promise<{
  rows: ScrapedApplication[], deadlines?: DeadlineSummary,
}> {
  if (rows.length === 0) return { rows };
  const postings = new Map<string, { id: string, url: string }>();
  const rowPostings = new Map<ScrapedApplication, string>();
  for (const row of rows) {
    if (row.platform !== 'jobkorea' || /상시|채용\s*시/.test(row.deadlineAt ?? '')) continue;
    const posting = jobkoreaPosting(row.url);
    if (!posting) continue;
    rowPostings.set(row, posting.id);
    if (postings.size < MAX_POSTINGS || postings.has(posting.id)) postings.set(posting.id, posting);
  }
  const targets = [...postings.values()];
  const results = new Map<string, string>();
  let lookupFailed = false;
  // 최대 10개 공고, 동시 2건, 각 4초. 같은 공고는 한 번만 조회한다.
  for (let index = 0; index < targets.length; index += 2) {
    const batch = targets.slice(index, index + 2);
    const fetched = await Promise.all(batch.map(fetchDeadline));
    fetched.forEach((result, i) => {
      if (result.failed) lookupFailed = true;
      if (result.date) results.set(batch[i].id, result.date);
    });
  }
  let matchedCount = 0;
  const enriched = rows.map((row) => {
    const id = rowPostings.get(row);
    const date = id ? results.get(id) : undefined;
    if (!date) return row;
    matchedCount++;
    return { ...row, deadlineAt: date };
  });
  return { rows: enriched, deadlines: { matchedCount, lookupFailed } };
}
