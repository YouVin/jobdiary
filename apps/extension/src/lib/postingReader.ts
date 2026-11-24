import {
  getPostingReference,
  isPostingImageUrl,
  MAX_POSTING_IMAGE_URLS,
  MAX_POSTING_TEXT_LENGTH,
  type PostingContent,
} from '@jobdiary/shared';

// 공고 페이지 읽기 (#238, 결정 기록 003). 웹앱이 요청한 공고 주소를 사용자 브라우저(서비스 워커)에서 읽는다.
// 서비스 워커에는 DOMParser가 없어 HTML을 문자열로 읽는다. 사이트 구조(2026-11-25 실물 확인):
// - 잡코리아: 공고 페이지 JSON-LD(JobPosting)에 제목·회사·정확한 근무지 주소, 요약 칸에 "근무시간",
//   본문은 같은 사이트 /Recruit/GI_Read_Comt_Ifrm?Gno=… (글 또는 file*.jobkorea.co.kr 이미지)
// - 사람인: 본문은 /zf_user/jobs/relay/view-detail?rec_idx=…&rec_seq=0 (글 + *.saraminimage.co.kr 이미지, 근무지도 본문 글에)

const REQUEST_TIMEOUT_MS = 6000;
const MAX_HTML_LENGTH = 3_000_000;

export type FetchText = (url: string) => Promise<string>;

const ENTITIES: Record<string, string> = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&middot;': '·' };

function decodeEntities(value: string): string {
  return value
    .replace(/&(nbsp|amp|lt|gt|quot|#39|middot);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

// HTML 조각 → 읽을 수 있는 글. 블록 요소 경계는 줄바꿈으로 남겨 AI가 칸 구분(주요 업무·자격 요건 등)을 알게 한다.
export function htmlToText(html: string): string {
  const text = html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|dt|dd|section|table|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(text)
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, MAX_POSTING_TEXT_LENGTH);
}

// 본문 이미지 주소: 허용된 이미지 서버만, 중복 없이, 최대 개수까지. 상대 주소는 페이지 주소 기준으로 바꾼다.
export function readImageUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const body = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  for (const match of body.matchAll(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    let url: string;
    try {
      url = new URL(decodeEntities(match[1]), baseUrl).href;
    } catch {
      continue;
    }
    if (isPostingImageUrl(url) && !urls.includes(url)) urls.push(url);
    if (urls.length >= MAX_POSTING_IMAGE_URLS) break;
  }
  return urls;
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

// 잡코리아 공고 페이지: JSON-LD JobPosting의 제목·회사·근무지 주소
export function readJobkoreaSummary(html: string): { title: string; company: string; location: string; workSchedule: string } {
  const summary = { title: '', company: '', location: '', workSchedule: '' };
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(match[1]);
    } catch {
      continue;
    }
    const entries = Array.isArray(data) ? data : record(data) && Array.isArray(data['@graph']) ? data['@graph'] : [data];
    for (const entry of entries) {
      if (!record(entry) || entry['@type'] !== 'JobPosting') continue;
      if (typeof entry.title === 'string') summary.title = entry.title.trim();
      if (record(entry.hiringOrganization) && typeof entry.hiringOrganization.name === 'string') summary.company = entry.hiringOrganization.name.trim();
      const places = Array.isArray(entry.jobLocation) ? entry.jobLocation : [entry.jobLocation];
      for (const place of places) {
        const address = record(place) && record(place.address) ? place.address : null;
        if (address && typeof address.streetAddress === 'string' && address.streetAddress.trim()) {
          summary.location = address.streetAddress.trim();
          break;
        }
      }
    }
  }
  // 요약 칸의 "근무시간" 다음 첫 목록 항목 (예: 주5일(월~금))
  const hours = html.match(/근무시간[\s\S]{0,400}?<li[^>]*>([\s\S]*?)<\/li>/);
  if (hours) summary.workSchedule = htmlToText(hours[1]).replace(/\n/g, ' ').slice(0, 200);
  return summary;
}

async function readJobkorea(postingId: string, url: string, fetchText: FetchText): Promise<PostingContent> {
  const page = await fetchText(url);
  const bodyUrl = `https://www.jobkorea.co.kr/Recruit/GI_Read_Comt_Ifrm?Gno=${postingId}`;
  const body = await fetchText(bodyUrl);
  const summary = readJobkoreaSummary(page);
  return { platform: 'jobkorea', postingId, url, ...summary, text: htmlToText(body), imageUrls: readImageUrls(body, bodyUrl) };
}

async function readSaramin(postingId: string, url: string, fetchText: FetchText): Promise<PostingContent> {
  const bodyUrl = `https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=${postingId}&rec_seq=0`;
  const body = await fetchText(bodyUrl);
  const text = htmlToText(body);
  // 사람인은 근무지가 본문 글에 "근무지 : …"로 있다. 한 줄만 가져오고, 나머지는 AI가 본문에서 읽는다.
  const location = text.match(/근무지\s*[:：]\s*([^\n]+)/)?.[1].trim().slice(0, 300) ?? '';
  return { platform: 'saramin', postingId, url, title: '', company: '', location, workSchedule: '', text, imageUrls: readImageUrls(body, bodyUrl) };
}

// 공고 주소 검사는 공유 계약(getPostingReference)을 쓴다. 잡코리아·사람인 공고 페이지만 읽는다(원티드는 아직 아님).
export async function readPosting(rawUrl: string, fetchText: FetchText): Promise<PostingContent> {
  const reference = getPostingReference(rawUrl);
  if (!reference || reference.platform === 'wanted') throw new Error('unsupported-posting');
  return reference.platform === 'jobkorea'
    ? readJobkorea(reference.postingId, reference.url, fetchText)
    : readSaramin(reference.postingId, reference.url, fetchText);
}

// 실제 요청: 로그인 정보(쿠키)를 보내지 않고, 다른 곳으로 넘어가면 실패로 본다(마감일 읽기와 같은 기준).
export const fetchPostingText: FetchText = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { credentials: 'omit', redirect: 'error', signal: controller.signal });
    if (!response.ok) throw new Error(`http-${response.status}`);
    const html = await response.text();
    if (html.length > MAX_HTML_LENGTH) throw new Error('too-large');
    return html;
  } finally {
    clearTimeout(timer);
  }
};
