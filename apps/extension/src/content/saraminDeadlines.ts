import type { ScrapedApplication } from '../types/application';
import { normalizeDeadline } from '../lib/dateNormalize';
import { SARAMIN_MOBILE_MESSAGE_TYPE, type DeadlineSummary, type SaraminMobileResponse } from '../lib/messages';
import { SARAMIN_MOBILE_SELECTORS } from './selectors/saramin';

function recruitId(href: string | undefined | null): string | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href, 'https://m.saramin.co.kr');
    if (url.protocol !== 'https:' || !(url.hostname === 'saramin.co.kr' || url.hostname.endsWith('.saramin.co.kr'))) return undefined;
    const id = url.searchParams.get('rec_idx');
    return id && /^\d+$/.test(id) ? id : undefined;
  }
  catch { return undefined; }
}

export function readSaraminMobileDeadlines(root: ParentNode): Map<string, string> {
  const candidates = new Map<string, string | undefined>();
  const conflicts = new Set<string>();
  root.querySelectorAll(SARAMIN_MOBILE_SELECTORS.container).forEach((card) => {
    const externalId = card.querySelector(SARAMIN_MOBILE_SELECTORS.externalId)?.getAttribute('value');
    const recIdx = recruitId(card.querySelector(SARAMIN_MOBILE_SELECTORS.jobLink)?.getAttribute('href'));
    if (!externalId || !/^\d+$/.test(externalId) || !recIdx) return;
    const title = card.querySelector(SARAMIN_MOBILE_SELECTORS.title)?.textContent?.trim() ?? '';
    // 확인된 제목의 마지막 접미사만 읽는다. (마감), 상시, 연도 없는 날짜는 추정하지 않는다.
    const suffix = title.match(/\(~(\d{4}-\d{2}-\d{2})\)$/);
    const deadline = normalizeDeadline(suffix?.[1]);
    const key = `${externalId}:${recIdx}`;
    if (candidates.has(key) && candidates.get(key) !== deadline) conflicts.add(key);
    candidates.set(key, deadline);
  });
  return new Map([...candidates].flatMap(([key, date]) => date && !conflicts.has(key) ? [[key, date]] : []));
}

export async function supplementSaraminDeadlines(rows: ScrapedApplication[]): Promise<{
  rows: ScrapedApplication[], deadlines?: DeadlineSummary,
}> {
  if (rows.length === 0) return { rows };
  try {
    const response = await chrome.runtime.sendMessage<{ type: typeof SARAMIN_MOBILE_MESSAGE_TYPE }, SaraminMobileResponse>({ type: SARAMIN_MOBILE_MESSAGE_TYPE });
    if (!response?.ok || typeof response.html !== 'string') throw new Error('mobile unavailable');
    const root = new DOMParser().parseFromString(response.html, 'text/html');
    if (!root.querySelector(SARAMIN_MOBILE_SELECTORS.container)) throw new Error('mobile list missing');
    const dates = readSaraminMobileDeadlines(root);
    let matchedCount = 0;
    const enriched = rows.map((row) => {
      if (row.platform !== 'saramin' || !row.externalId) return row;
      const recIdx = recruitId(row.url);
      const date = recIdx ? dates.get(`${row.externalId}:${recIdx}`) : undefined;
      if (!date) return row;
      matchedCount++;
      return { ...row, deadlineAt: date };
    });
    return { rows: enriched, deadlines: { matchedCount, lookupFailed: false } };
  }
  catch {
    return { rows, deadlines: { matchedCount: 0, lookupFailed: true } };
  }
}
