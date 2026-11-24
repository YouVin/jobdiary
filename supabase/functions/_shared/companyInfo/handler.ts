import {
  buildAnalysisRequest,
  estimateCostUsd,
  verifyQuotes,
  type AnalysisModel,
  type AnalysisResult,
  type PostingImage,
  type PostingImageMediaType,
  type UsageLike,
} from '../postingAnalysis/analysis.ts';

// 회사 정보 만들기 처리 순서 (#228, 결정 기록 002). DB·AI 호출은 deps로 받아, Deno(Edge Function)와
// Node 테스트가 같은 코드를 쓴다. 순서가 곧 보안·비용 규칙이다:
// 로그인 → 입력 검사 → 본인 지원 확인 → 같은 공고 결과 재사용(한도 안 씀) → 하루 한도 → AI → 인용 검사 → 저장.
// 공고는 글(postingText) 또는 이미지 조각(postingImages, #232) 중 하나로 받는다.

export const COMPANY_INFO_MODEL: AnalysisModel = 'claude-haiku-5-5'; // 결정 기록 001: 1차 실측 근거로 Haiku 5.5로 시작
export const COMPANY_INFO_VARIANT = 'lean' as const; // 비용 절감 방식 (1차 실측: 1건 $0.0007, 4.6초)
export const PROMPT_VERSION = '2026-11-25.4'; // 지시문·결과 형식을 바꾸면 올린다. 같은 공고라도 버전이 다르면 새로 만든다 (#237 업무·자격에서도 강점 찾기)
export const DAILY_LIMIT = 5; // 사용자당 하루(한국 날짜) 새로 만드는 횟수
export const MIN_POSTING_LENGTH = 200;
export const MAX_POSTING_LENGTH = 15_000;
// 이미지 조각: 브라우저가 가로 1,000px·세로 1,400px 이하로 잘라 JPEG로 보낸다. 서버는 개수·크기만 다시 막는다.
export const MAX_POSTING_IMAGES = 12;
export const MAX_IMAGE_BASE64_LENGTH = 4_000_000; // 조각 1개 약 3MB (Claude 상한 10MB보다 훨씬 작게)
export const MAX_TOTAL_IMAGE_BASE64_LENGTH = 16_000_000; // 요청 전체 약 12MB
export const MIN_TRANSCRIPT_LENGTH = 50; // 이보다 짧게 읽혔으면 공고 이미지가 아닌 것으로 본다
const IMAGE_MEDIA_TYPES: PostingImageMediaType[] = ['image/jpeg', 'image/png', 'image/webp'];
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export interface ApplicationRow {
  id: string;
  company: string;
  position: string;
  status: string;
}

// 회사 정보는 서류 통과한 지원부터 만든다(#242 사용자 결정: 그 전에는 알 필요가 적고, AI 비용도 아낀다).
export const COMPANY_INFO_STAGES = ['screening', 'interview', 'interviewed', 'offer'];

export interface StoredAnalysis {
  id: string;
  result: AnalysisResult;
  model: string;
  createdAt: string;
}

export interface AnalyzeOutcome {
  stopReason: string | null;
  model: string;
  usage: UsageLike;
  result: AnalysisResult | null; // stopReason이 refusal이면 null
}

export interface CompanyInfoDeps {
  getUserId(): Promise<string | null>; // 요청 JWT로 서버가 직접 확인한 사용자
  getApplication(applicationId: string): Promise<ApplicationRow | null>; // 요청자 권한(RLS)으로 읽는다 → 남의 지원은 null
  findAnalysis(postingHash: string): Promise<StoredAnalysis | null>;
  consumeQuota(userId: string, limit: number): Promise<boolean>;
  releaseQuota(userId: string): Promise<void>;
  analyze(request: ReturnType<typeof buildAnalysisRequest>): Promise<AnalyzeOutcome>;
  saveAnalysis(row: { postingHash: string; model: string; promptVersion: string; result: AnalysisResult; usage: UsageLike; costUsd: number }): Promise<StoredAnalysis>;
  linkApplication(row: { applicationId: string; userId: string; analysis: StoredAnalysis }): Promise<void>;
  sha256(text: string): Promise<string>;
  logError(message: string, detail?: unknown): void;
}

export interface HandlerResponse {
  status: number;
  body: Record<string, unknown>;
}

// 공고 페이지에서 읽은 사실(#238, 결정 기록 003). 익스텐션이 공고 페이지 구조화 데이터·요약 칸에서 읽은 값이라
// AI가 읽은 값보다 정확하다. 근무지·근무 일정은 결과에서 이 값을 우선한다.
export interface PageFacts {
  title: string;
  location: string;
  workSchedule: string;
}

type PostingSource =
  | { kind: 'text'; postingText: string }
  | { kind: 'image'; images: PostingImage[] }
  | { kind: 'page'; postingText: string; images: PostingImage[]; facts: PageFacts };

export const MIN_PAGE_TEXT_LENGTH = 100; // 공고 페이지 글이 이보다 짧고 이미지도 없으면 읽을 게 없는 것으로 본다

function shortText(value: unknown, max: number): string | null {
  if (value === undefined) return '';
  return typeof value === 'string' ? value.trim().slice(0, max) : null;
}

// 공고 페이지 입력 검사: 글(15,000자까지)·이미지 조각(선택)·페이지 사실(각 300자까지)
function readPage(value: unknown): Extract<PostingSource, { kind: 'page' }> | 'too_large' | null {
  if (!value || typeof value !== 'object') return null;
  const page = value as Record<string, unknown>;
  const text = shortText(page.text, MAX_POSTING_LENGTH);
  const title = shortText(page.title, 300);
  const location = shortText(page.location, 300);
  const workSchedule = shortText(page.workSchedule, 300);
  if (text === null || title === null || location === null || workSchedule === null) return null;
  let images: PostingImage[] = [];
  if (page.images !== undefined && !(Array.isArray(page.images) && page.images.length === 0)) {
    const read = readImages(page.images);
    if (!read) return null;
    if (read === 'too_large') return 'too_large';
    images = read;
  }
  return { kind: 'page', postingText: text, images, facts: { title, location, workSchedule } };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status: number, error: string, code: string): HandlerResponse {
  return { status, body: { error, code } };
}

// 이미지 조각 검사. 형식이 틀리면 null(400), 개수·크기가 넘치면 'too_large'.
function readImages(value: unknown): PostingImage[] | 'too_large' | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value.length > MAX_POSTING_IMAGES) return 'too_large';
  const images: PostingImage[] = [];
  let total = 0;
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const { mediaType, data } = item as Record<string, unknown>;
    if (typeof mediaType !== 'string' || !IMAGE_MEDIA_TYPES.includes(mediaType as PostingImageMediaType)) return null;
    if (typeof data !== 'string' || data.length === 0) return null;
    if (data.length > MAX_IMAGE_BASE64_LENGTH) return 'too_large';
    if (!BASE64.test(data)) return null;
    total += data.length;
    images.push({ mediaType: mediaType as PostingImageMediaType, data });
  }
  return total > MAX_TOTAL_IMAGE_BASE64_LENGTH ? 'too_large' : images;
}

function readBody(body: unknown): { applicationId: string; source: PostingSource | 'too_large'; regenerate: boolean } | null {
  if (!body || typeof body !== 'object') return null;
  const { applicationId, postingText, postingImages, postingPage, regenerate } = body as Record<string, unknown>;
  if (typeof applicationId !== 'string' || !UUID.test(applicationId)) return null;
  if (regenerate !== undefined && typeof regenerate !== 'boolean') return null;
  const hasText = postingText !== undefined;
  const hasImages = postingImages !== undefined;
  const hasPage = postingPage !== undefined;
  if (Number(hasText) + Number(hasImages) + Number(hasPage) !== 1) return null; // 글·이미지·공고 페이지 중 정확히 하나
  let source: PostingSource | 'too_large';
  if (hasPage) {
    const page = readPage(postingPage);
    if (!page) return null;
    source = page;
  } else if (hasText) {
    if (typeof postingText !== 'string') return null;
    source = { kind: 'text', postingText };
  } else {
    const images = readImages(postingImages);
    if (!images) return null;
    source = images === 'too_large' ? 'too_large' : { kind: 'image', images };
  }
  return { applicationId, source, regenerate: regenerate === true };
}

// 같은 공고 판단용 지문. 공백 차이는 같은 공고로 본다. 모델·방식·지시문 버전이 바뀌면 다른 결과로 본다.
export function postingFingerprint(companyName: string, postingText: string): string {
  const normalized = postingText.normalize('NFKC').replace(/\s+/g, ' ').trim();
  return [PROMPT_VERSION, COMPANY_INFO_MODEL, COMPANY_INFO_VARIANT, companyName.normalize('NFKC').trim(), normalized].join('\n');
}

// 이미지 공고의 지문: 조각 바이트가 같아야 같은 공고로 본다(캡처를 다시 하면 새로 만든다).
export function imageFingerprint(companyName: string, images: PostingImage[]): string {
  return [PROMPT_VERSION, COMPANY_INFO_MODEL, COMPANY_INFO_VARIANT, 'image', companyName.normalize('NFKC').trim(),
    ...images.map((image) => `${image.mediaType}:${image.data}`)].join('\n');
}

// 공고 원문(이미지면 AI가 옮겨 적은 글)에 없는 인용이 붙은 강점은 보여 주지 않는다(지어낸 근거 차단).
export function keepVerifiedStrengths(result: AnalysisResult, postingText: string): AnalysisResult {
  const { missing } = verifyQuotes(result, postingText);
  if (missing.length === 0) return result;
  return { ...result, strengths: result.strengths.filter((item) => !missing.includes(item.quote)) };
}

// 대표 사이트는 공고(이미지면 읽은 글)에 실제로 적힌 주소만 남긴다. AI가 주소를 지어내면 엉뚱한 사이트로 보낼 수 있다.
export function keepVerifiedWebsite(result: AnalysisResult, postingText: string): AnalysisResult {
  const website = result.company?.website?.trim() ?? '';
  if (!website) return result;
  const host = website.replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase();
  const found = host.length > 3 && postingText.toLowerCase().replace(/\s+/g, '').includes(host.replace(/\s+/g, ''));
  return found ? result : { ...result, company: { ...result.company, website: '' } };
}

// 공고 페이지 입력의 지문: 글·이미지·페이지 사실이 모두 같아야 같은 공고로 본다.
export function pageFingerprint(companyName: string, page: Extract<PostingSource, { kind: 'page' }>): string {
  return [PROMPT_VERSION, COMPANY_INFO_MODEL, COMPANY_INFO_VARIANT, 'page', companyName.normalize('NFKC').trim(),
    page.facts.title, page.facts.location, page.facts.workSchedule, page.postingText.normalize('NFKC').replace(/\s+/g, ' ').trim(),
    ...page.images.map((image) => `${image.mediaType}:${image.data}`)].join('\n');
}

function pageFactsForPrompt(facts: PageFacts): Record<string, string> {
  const result: Record<string, string> = {};
  if (facts.title) result['공고 제목'] = facts.title;
  if (facts.location) result['근무지 주소(공고 페이지)'] = facts.location;
  if (facts.workSchedule) result['근무 일정(공고 페이지)'] = facts.workSchedule;
  return result;
}

// 근무지·근무 일정은 AI가 읽은 값보다 공고 페이지 값이 정확하다(#238: 캡처에서는 "서울"만 나왔다).
export function preferPageFacts(result: AnalysisResult, facts: PageFacts): AnalysisResult {
  const workplace = { ...result.workplace };
  if (facts.location) workplace.location = facts.location;
  if (facts.workSchedule && !workplace.workDays && !workplace.workHours) workplace.workDays = facts.workSchedule;
  return { ...result, workplace };
}

function publicView(analysis: StoredAnalysis, cached: boolean): HandlerResponse {
  return { status: 200, body: { companyInfo: { result: analysis.result, model: analysis.model, createdAt: analysis.createdAt }, cached } };
}

export async function handleCompanyInfo(deps: CompanyInfoDeps, rawBody: unknown): Promise<HandlerResponse> {
  // 1) 신원은 JWT 검증 결과만 믿는다. 본문의 어떤 값도 신원으로 쓰지 않는다.
  const userId = await deps.getUserId();
  if (!userId) return fail(401, '로그인이 필요해요.', 'unauthorized');

  // 2) 입력 검사
  const body = readBody(rawBody);
  if (!body) return fail(400, '요청 형식이 올바르지 않아요.', 'bad_request');
  if (body.source === 'too_large') {
    return fail(400, `공고 이미지가 너무 커요. 공고 본문 부분만 캡처해 주세요. (최대 ${MAX_POSTING_IMAGES}조각)`, 'images_too_large');
  }
  const source = body.source;
  let postingText = '';
  if (source.kind === 'text') {
    const trimmed = source.postingText.trim();
    if (trimmed.length < MIN_POSTING_LENGTH) {
      return fail(400, '공고 내용이 너무 짧아요. 주요 업무와 자격 요건이 들어가게 붙여 넣어 주세요.', 'posting_too_short');
    }
    postingText = trimmed.slice(0, MAX_POSTING_LENGTH);
  }
  if (source.kind === 'page') {
    postingText = source.postingText;
    if (postingText.length < MIN_PAGE_TEXT_LENGTH && source.images.length === 0) {
      return fail(400, '공고 페이지에서 공고 내용을 찾지 못했어요. 공고가 마감됐는지 확인해 주세요.', 'page_empty');
    }
  }

  // 3) 본인 지원인지: 요청자 권한으로 읽어 RLS가 걸러 준다.
  const application = await deps.getApplication(body.applicationId);
  if (!application) return fail(404, '지원을 찾을 수 없어요.', 'not_found');
  if (!COMPANY_INFO_STAGES.includes(application.status)) return fail(403, '회사 정보는 서류 통과한 지원부터 만들 수 있어요.', 'stage_not_ready');

  // 4) 같은 공고 결과가 있으면 그대로 쓴다. 한도도 비용도 들지 않는다.
  const fingerprint = source.kind === 'text'
    ? postingFingerprint(application.company, postingText)
    : source.kind === 'image'
      ? imageFingerprint(application.company, source.images)
      : pageFingerprint(application.company, source);
  const postingHash = await deps.sha256(fingerprint);
  if (!body.regenerate) {
    const existing = await deps.findAnalysis(postingHash);
    if (existing) {
      await deps.linkApplication({ applicationId: application.id, userId, analysis: existing });
      return publicView(existing, true);
    }
  }

  // 5) 하루 한도. DB 함수가 한 번에 세고 올려, 동시에 눌러도 한도를 넘지 않는다.
  const allowed = await deps.consumeQuota(userId, DAILY_LIMIT);
  if (!allowed) {
    return fail(429, `회사 정보는 하루 ${DAILY_LIMIT}번까지 새로 만들 수 있어요. 내일 다시 해 주세요.`, 'daily_limit');
  }

  // 6) AI 호출. 실패하면 한도를 되돌린다(사용자 잘못이 아닌 실패로 하루 횟수를 잃지 않게).
  const request = buildAnalysisRequest(COMPANY_INFO_MODEL, COMPANY_INFO_VARIANT, {
    companyName: application.company,
    postingText,
    images: source.kind === 'text' || source.images.length === 0 ? undefined : source.images,
    facts: source.kind === 'page' ? pageFactsForPrompt(source.facts) : undefined,
  });
  let outcome: AnalyzeOutcome;
  try {
    outcome = await deps.analyze(request);
  } catch (error) {
    deps.logError('[company-info] AI 호출 실패', error);
    await deps.releaseQuota(userId);
    return fail(502, 'AI 응답을 받지 못했어요. 잠시 후 다시 해 주세요.', 'ai_unavailable');
  }
  if (outcome.stopReason === 'refusal' || !outcome.result) {
    await deps.releaseQuota(userId);
    return fail(422, '이 공고는 정리할 수 없었어요. 공고 내용을 확인해 주세요.', 'refused');
  }
  if (outcome.stopReason === 'max_tokens') {
    deps.logError('[company-info] 출력 상한 도달', { usage: outcome.usage });
    await deps.releaseQuota(userId);
    return fail(502, 'AI 응답이 중간에 끊겼어요. 잠시 후 다시 해 주세요.', 'ai_truncated');
  }

  // 7) 인용 검사. 이미지 공고는 AI가 옮겨 적은 글이 기준이다. 글을 거의 못 읽었으면 공고 이미지가 아닌 것으로 본다.
  let quoteSource = postingText;
  const hasImages = source.kind !== 'text' && source.images.length > 0;
  if (hasImages) {
    const transcript = outcome.result.transcript?.trim() ?? '';
    quoteSource = [postingText, transcript].filter(Boolean).join('\n');
    // 글이 거의 없고 이미지도 못 읽었으면 공고가 아닌 것으로 본다(공고 페이지 글이 충분하면 이미지를 못 읽어도 진행)
    if (transcript.length < MIN_TRANSCRIPT_LENGTH && postingText.length < MIN_PAGE_TEXT_LENGTH) {
      await deps.releaseQuota(userId);
      return fail(422, '공고 이미지에서 글을 읽지 못했어요. 잠시 후 다시 해 주세요.', 'unreadable_image');
    }
  }
  const verified = keepVerifiedWebsite(keepVerifiedStrengths(outcome.result, quoteSource), quoteSource);
  const result = source.kind === 'page' ? preferPageFacts(verified, source.facts) : verified;

  // 진단(#237): 강점이 비었을 때 "AI가 못 찾았나, 인용 검사에서 버렸나, 글을 덜 읽었나"를 숫자로 가린다. 내용은 남기지 않는다.
  const diagnostics = {
    source: source.kind,
    imageCount: source.kind === 'text' ? 0 : source.images.length,
    readChars: quoteSource.length,
    strengthsReturned: outcome.result.strengths.length,
    strengthsKept: result.strengths.length,
  };
  if (result.strengths.length < outcome.result.strengths.length) {
    deps.logError('[company-info] 인용 검사로 강점을 버림', diagnostics);
  }

  // 8) 저장. 이미지는 저장하지 않고 결과(읽은 글 포함)만 남긴다.
  const saved = await deps.saveAnalysis({
    postingHash,
    model: outcome.model,
    promptVersion: PROMPT_VERSION,
    result,
    usage: Object.assign({}, outcome.usage, { diagnostics }),
    costUsd: estimateCostUsd(COMPANY_INFO_MODEL, outcome.usage),
  });
  await deps.linkApplication({ applicationId: application.id, userId, analysis: saved });
  return publicView(saved, false);
}
