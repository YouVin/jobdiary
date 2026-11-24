import {
  buildAnalysisRequest,
  estimateCostUsd,
  verifyQuotes,
  type AnalysisModel,
  type AnalysisResult,
  type UsageLike,
} from '../postingAnalysis/analysis.ts';

// 회사 정보 만들기 처리 순서 (#228, 결정 기록 002). DB·AI 호출은 deps로 받아, Deno(Edge Function)와
// Node 테스트가 같은 코드를 쓴다. 순서가 곧 보안·비용 규칙이다:
// 로그인 → 입력 검사 → 본인 지원 확인 → 같은 공고 결과 재사용(한도 안 씀) → 하루 한도 → AI → 인용 검사 → 저장.

export const COMPANY_INFO_MODEL: AnalysisModel = 'claude-haiku-5-5'; // 결정 기록 001: 1차 실측 근거로 Haiku 5.5로 시작
export const COMPANY_INFO_VARIANT = 'lean' as const; // 비용 절감 방식 (1차 실측: 1건 $0.0007, 4.6초)
export const PROMPT_VERSION = '2026-11-24.1'; // 지시문·결과 형식을 바꾸면 올린다. 같은 공고라도 버전이 다르면 새로 만든다
export const DAILY_LIMIT = 5; // 사용자당 하루(한국 날짜) 새로 만드는 횟수
export const MIN_POSTING_LENGTH = 200;
export const MAX_POSTING_LENGTH = 15_000;

export interface ApplicationRow {
  id: string;
  company: string;
  position: string;
}

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status: number, error: string, code: string): HandlerResponse {
  return { status, body: { error, code } };
}

function readBody(body: unknown): { applicationId: string; postingText: string; regenerate: boolean } | null {
  if (!body || typeof body !== 'object') return null;
  const { applicationId, postingText, regenerate } = body as Record<string, unknown>;
  if (typeof applicationId !== 'string' || !UUID.test(applicationId)) return null;
  if (typeof postingText !== 'string') return null;
  if (regenerate !== undefined && typeof regenerate !== 'boolean') return null;
  return { applicationId, postingText, regenerate: regenerate === true };
}

// 같은 공고 판단용 지문. 공백 차이는 같은 공고로 본다. 모델·방식·지시문 버전이 바뀌면 다른 결과로 본다.
export function postingFingerprint(companyName: string, postingText: string): string {
  const normalized = postingText.normalize('NFKC').replace(/\s+/g, ' ').trim();
  return [PROMPT_VERSION, COMPANY_INFO_MODEL, COMPANY_INFO_VARIANT, companyName.normalize('NFKC').trim(), normalized].join('\n');
}

// 공고 원문에 없는 인용이 붙은 강점은 보여 주지 않는다(지어낸 근거 차단).
export function keepVerifiedStrengths(result: AnalysisResult, postingText: string): AnalysisResult {
  const { missing } = verifyQuotes(result, postingText);
  if (missing.length === 0) return result;
  return { ...result, strengths: result.strengths.filter((item) => !missing.includes(item.quote)) };
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
  const trimmed = body.postingText.trim();
  if (trimmed.length < MIN_POSTING_LENGTH) {
    return fail(400, '공고 내용이 너무 짧아요. 주요 업무와 자격 요건이 들어가게 붙여 넣어 주세요.', 'posting_too_short');
  }
  const postingText = trimmed.slice(0, MAX_POSTING_LENGTH);

  // 3) 본인 지원인지: 요청자 권한으로 읽어 RLS가 걸러 준다.
  const application = await deps.getApplication(body.applicationId);
  if (!application) return fail(404, '지원을 찾을 수 없어요.', 'not_found');

  // 4) 같은 공고 결과가 있으면 그대로 쓴다. 한도도 비용도 들지 않는다.
  const postingHash = await deps.sha256(postingFingerprint(application.company, postingText));
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
  const request = buildAnalysisRequest(COMPANY_INFO_MODEL, COMPANY_INFO_VARIANT, { companyName: application.company, postingText });
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

  // 7) 인용 검사 후 저장
  const result = keepVerifiedStrengths(outcome.result, postingText);
  const saved = await deps.saveAnalysis({
    postingHash,
    model: outcome.model,
    promptVersion: PROMPT_VERSION,
    result,
    usage: outcome.usage,
    costUsd: estimateCostUsd(COMPANY_INFO_MODEL, outcome.usage),
  });
  await deps.linkApplication({ applicationId: application.id, userId, analysis: saved });
  return publicView(saved, false);
}
