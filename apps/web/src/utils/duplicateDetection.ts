import type { Application, Platform } from '@/types/application';
import { toDateOnly } from '@/utils/applicationStats';
import { toDateInputValue } from '@/utils/format';

// 동일 지원은 갱신하고, 사용자가 직접 정한 상태와 일기 등은 유지한다.
export type ImportDecision =
  | { type: 'add' }
  | { type: 'add-duplicate' }
  | { type: 'skip' }
  | { type: 'update'; target: Application };

export type IncomingApplication = Omit<Application, 'id' | 'updatedAt'>;

function normalizeText(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

// ── 사이트 간 중복 판별 기준 (#220) ──
// 같은 공고라도 사이트마다 공고명이 다르게 들어온다. 사람인은 모집 부문(rec_division, 예: "프론트엔드"),
// 잡코리아는 공고 제목 전체(gititle, 예: "[IT/통신] STAGE FIVE 프론트엔드 개발자 채용")를 가져온다.
// 그래서 글자 그대로 비교하지 않고, 회사는 법인 표기·공백·기호를 뺀 이름으로, 공고는 핵심 단어로 비교한다.
const LEGAL_ENTITY = /\((주|유|재|사|합)\)|주식회사|유한책임회사|유한회사|재단법인|사단법인|합자회사|합명회사|\b(co|corp|inc|ltd)\b\.?/g;
const NOT_LETTER = /[^\p{L}\p{N}]+/gu;

// 회사 비교용 이름: "㈜스테이지파이브"·"(주) 스테이지파이브"·"주식회사 스테이지파이브" → "스테이지파이브"
export function companyKey(company: string): string {
  return company.normalize('NFKC').toLowerCase().replace(LEGAL_ENTITY, '').replace(NOT_LETTER, '');
}

// 영어 직무 표기를 한글로 맞춘다.
const ROLE_SYNONYMS: Array<[RegExp, string]> = [
  [/front[\s-]?end/g, '프론트엔드'],
  [/back[\s-]?end/g, '백엔드'],
  [/full[\s-]?stack/g, '풀스택'],
  [/publisher/g, '퍼블리셔'],
  [/developer|engineer/g, '개발자'],
  [/designer/g, '디자이너'],
];

// 공고를 가르지 않는 흔한 말. 이 말만 같다고 같은 공고로 보지 않고, 이 말이 없다고 다른 공고로 보지도 않는다.
const NOISE_WORDS = new Set([
  '채용', '모집', '공고', '수시', '상시', '신입', '경력', '경력무관', '신입경력', '정규직', '계약직', '인턴', '전환형',
  '부문', '분야', '담당', '담당자', '및', '각', '외', '급구', '우대', '정규', '경력직', '신입사원', '사원', '직원',
]);

// 공고 핵심 단어: 말머리([...]·【...】·<...>)를 빼고, 흔한 말과 "0명" 같은 인원 표기를 뺀다.
export function positionTokens(position: string): string[] {
  let text = position.normalize('NFKC').toLowerCase().replace(/\[[^\]]*\]|【[^】]*】|<[^>]*>/g, ' ');
  for (const [pattern, replacement] of ROLE_SYNONYMS) text = text.replace(pattern, replacement);
  const tokens: string[] = [];
  for (const token of text.split(NOT_LETTER)) {
    if (!token || NOISE_WORDS.has(token) || /^\d+명?$/.test(token)) continue;
    tokens.push(token);
  }
  return tokens;
}

// 한쪽 핵심 단어가 모두 다른 쪽 공고명 안에 들어 있으면 같은 공고다.
// "프론트엔드" ⊂ "it 통신 stage five 프론트엔드 개발자" → 같음, "프론트엔드" vs "백엔드" → 다름.
// 한쪽이 흔한 말뿐이라(예: "신입 채용") 핵심 단어가 없으면 회사만 같아도 같은 공고로 본다.
interface PostingKey {
  company: string;
  tokens: string[];
  compact: string;
}

// 보드는 지원이 바뀔 때마다 묶음을 다시 계산하는데, 회사·공고 이름은 거의 그대로다. 한 번 만든 결과를 기억해
// 정규식을 다시 돌리지 않는다. 사용자 한 명의 이름 수만큼만 쌓이고, 너무 커지면 비운다.
const POSTING_CACHE_LIMIT = 5000;
const companyCache = new Map<string, string>();
const tokenCache = new Map<string, string[]>();

function cached<T>(cache: Map<string, T>, key: string, make: (value: string) => T): T {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (cache.size >= POSTING_CACHE_LIMIT) cache.clear();
  const value = make(key);
  cache.set(key, value);
  return value;
}

function postingKey(posting: Pick<Application, 'company' | 'position'>): PostingKey {
  const tokens = cached(tokenCache, posting.position, positionTokens);
  return { company: cached(companyCache, posting.company, companyKey), tokens, compact: tokens.join('') };
}

function isSamePostingKey(a: PostingKey, b: PostingKey): boolean {
  if (!a.company || a.company !== b.company) return false;
  if (a.tokens.length === 0 || b.tokens.length === 0) return true;
  return a.tokens.every((token) => b.compact.includes(token)) || b.tokens.every((token) => a.compact.includes(token));
}

export function isSamePosting(a: Pick<Application, 'company' | 'position'>, b: Pick<Application, 'company' | 'position'>): boolean {
  return isSamePostingKey(postingKey(a), postingKey(b));
}

export function hasManualStatus(application: Application): boolean {
  // 기존 데이터에 변경 주체가 없다면 진행/종료 상태를 보수적으로 보호한다.
  return application.statusSource === 'manual' || application.statusSource === 'deadline' || application.statusSource === 'created' ||
    (application.statusSource === undefined && application.status !== 'applied');
}

export function mergeImportedApplication(existing: Application, incoming: IncomingApplication): Application {
  return {
    ...existing,
    company: normalizeText(incoming.company),
    position: normalizeText(incoming.position),
    status: hasManualStatus(existing) ? existing.status : incoming.status,
    appliedAt: incoming.appliedAt,
    deadlineAt: incoming.deadlineAt ?? existing.deadlineAt,
    externalId: incoming.externalId?.trim() || existing.externalId,
    url: incoming.url ?? existing.url,
  };
}

// 지원/취소에서 ID가 달라지거나 ID가 없는 경우 같은 플랫폼의 회사명+공고명으로 보완한다.
function findSameListing(
  existingApplications: Application[],
  newApplication: IncomingApplication,
): Application | undefined {
  return existingApplications.find(
    (existing) =>
      existing.platform === newApplication.platform &&
      normalizeText(existing.company) === normalizeText(newApplication.company) &&
      normalizeText(existing.position) === normalizeText(newApplication.position),
  );
}

// 두 지원건의 내용(상태, 지원일)이 실질적으로 동일한지 비교
function isSameContent(existing: Application, incoming: IncomingApplication): boolean {
  const merged = mergeImportedApplication(existing, incoming);
  return (
    existing.company === merged.company &&
    existing.position === merged.position &&
    existing.externalId === merged.externalId &&
    existing.status === merged.status &&
    toDateInputValue(existing.appliedAt) === toDateInputValue(merged.appliedAt) &&
    existing.deadlineAt === merged.deadlineAt && existing.url === merged.url
  );
}

// 새로 수집된 지원건 하나를 기존 목록과 비교해 저장 여부를 판별한다 (docs/INTEGRATION.md §5)
export function getImportDecision(
  existingApplications: Application[],
  newApplication: IncomingApplication,
): ImportDecision {
  // 지원 ID가 같으면 회사명/공고명이 바뀌어도 같은 지원이다.
  const externalId = newApplication.externalId?.trim();
  const sameSubmission = externalId ? existingApplications.find((existing) =>
    existing.platform === newApplication.platform && existing.externalId?.trim() === externalId,
  ) : undefined;
  const target = sameSubmission ?? findSameListing(existingApplications, newApplication);

  if (target) {
    // 지원/취소가 서로 다른 ID로 오는 경우, 오래된 지원 행이 최신 취소를 되돌리지 않게 한다.
    if (!sameSubmission && toDateInputValue(newApplication.appliedAt) < toDateInputValue(target.appliedAt)) {
      return { type: 'skip' };
    }
    return isSameContent(target, newApplication) ? { type: 'skip' } : { type: 'update', target };
  }

  // 3) 같은 사이트의 같은 공고는 위에서 찾았다. 다른 사이트에 같은 회사·같은 공고(핵심 단어 기준, #220)가 있으면
  //    크로스플랫폼 중복 지원이다. 같은 사이트의 비슷한 공고는 다른 공고라 중복으로 세지 않는다.
  const incomingKey = postingKey(newApplication);
  const hasSameCompanyPosition = existingApplications.some(
    (existing) => existing.platform !== newApplication.platform && isSamePostingKey(postingKey(existing), incomingKey),
  );

  return hasSameCompanyPosition ? { type: 'add-duplicate' } : { type: 'add' };
}

// 사이트 간 중복 지원 묶음 (#186). 같은 회사·같은 공고(isSamePosting, #220)이고 서로 다른 platform이 2개 이상 섞인
// 지원끼리 묶는다(docs/INTEGRATION.md §5). 같은 회사 안에서 같은 공고끼리 이어 붙인다(A~B, B~C면 A·B·C 한 묶음).
// 같은 platform끼리만 이어진 묶음은 같은 사이트의 상태 변화나 다른 공고라 기준에서 뺀다.
// 저장하지 않고 렌더 시점에만 계산하는 값이라 별도 DB 필드나 캐시가 필요 없다.
export interface DuplicateGroup {
  key: string;
  company: string;
  position: string;
  applications: Application[]; // 먼저 지원한 순
  platforms: Platform[]; // 처음 지원한 사이트부터, 중복 없이
  latestAppliedAt: string; // 묶음에서 가장 최근 지원일 (YYYY-MM-DD)
}

function appliedDate(application: Application): string {
  return toDateOnly(application.appliedAt) ?? '';
}

// 날짜(YYYY-MM-DD)·id는 글자 순서 비교로 충분하다. localeCompare는 비교마다 언어 규칙을 거쳐 수천 번 부르면 느리다.
function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const KOREAN_ORDER = new Intl.Collator('ko');

// 최근에 지원한 묶음이 위. 같은 날이면 회사명 순.
export function getDuplicateGroups(applications: Application[]): DuplicateGroup[] {
  // 1) 회사별로 나눈다. 회사가 다르면 같은 공고일 수 없어 서로 비교할 필요가 없다.
  //    회사 이름·공고 핵심 단어는 지원마다 한 번만 만든다(쌍마다 다시 만들면 500건에서 약 12ms).
  const byCompany = new Map<string, Array<{ application: Application; key: PostingKey }>>();
  for (const application of applications) {
    const key = postingKey(application);
    if (!key.company) continue;
    const list = byCompany.get(key.company);
    if (list) {
      list.push({ application, key });
    } else {
      byCompany.set(key.company, [{ application, key }]);
    }
  }

  // 2) 같은 회사 안에서 같은 공고끼리 이어 붙인다(유니온 파인드). 한 회사 지원은 보통 몇 건이라 쌍 비교로 충분하다.
  const groups: Application[][] = [];
  for (const list of byCompany.values()) {
    if (list.length < 2) continue;
    const parent = list.map((_, index) => index);
    const find = (index: number): number => {
      let current = index;
      while (parent[current] !== current) {
        parent[current] = parent[parent[current]];
        current = parent[current];
      }
      return current;
    };
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (isSamePostingKey(list[i].key, list[j].key)) parent[find(i)] = find(j);
      }
    }
    const byRoot = new Map<number, Application[]>();
    for (let i = 0; i < list.length; i += 1) {
      const root = find(i);
      const group = byRoot.get(root);
      if (group) {
        group.push(list[i].application);
      } else {
        byRoot.set(root, [list[i].application]);
      }
    }
    groups.push(...byRoot.values());
  }

  // 3) 서로 다른 사이트가 2곳 이상 섞인 묶음만 남긴다.
  const result: DuplicateGroup[] = [];
  for (const group of groups) {
    const sorted = [...group].sort((a, b) => compareText(appliedDate(a), appliedDate(b)) || compareText(a.id, b.id));
    const platforms = [...new Set(sorted.map((application) => application.platform))];
    if (platforms.length < 2) continue;
    result.push({
      key: JSON.stringify([companyKey(sorted[0].company), sorted[0].id]),
      company: normalizeText(sorted[0].company),
      position: normalizeText(sorted[0].position),
      applications: sorted,
      platforms,
      latestAppliedAt: appliedDate(sorted[sorted.length - 1]),
    });
  }
  return result.sort((a, b) => compareText(b.latestAppliedAt, a.latestAppliedAt) || KOREAN_ORDER.compare(a.company, b.company));
}

// 보드 카드의 "중복 지원" 배지용 id 집합. 묶음 계산과 같은 기준이다.
export function getDuplicateApplicationIds(applications: Application[]): Set<string> {
  const duplicateIds = new Set<string>();
  for (const group of getDuplicateGroups(applications)) {
    for (const application of group.applications) duplicateIds.add(application.id);
  }
  return duplicateIds;
}
