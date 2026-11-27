import {
  buildProcessRequest,
  estimateProcessCostUsd,
  normalizeProcess,
  PROCESS_MODEL,
  PROCESS_PROMPT_VERSION,
  type ProcessImageMediaType,
  type ProcessStep,
} from './process.ts';

// 전형 절차 읽기 처리 순서 (#295). DB·AI는 deps로 받아 Deno와 Node 테스트가 같은 코드를 쓴다.
// 로그인 → 입력 검사 → 본인 지원 확인 → 같은 공고 결과 재사용(한도 안 씀) → 하루 한도 → AI → 정리 → 저장.
// 가져올 때 모든 지원에 자동으로 돌므로 한도는 회사 정보(하루 5번)보다 넉넉하고, 결과가 없어도 저장해 다시 부르지 않는다.

export const PROCESS_DAILY_LIMIT = 60;
export const MAX_PROCESS_TEXT_LENGTH = 20_000;
export const MAX_PROCESS_IMAGES = 8; // 긴 공고도 절차는 대개 아래쪽이라 조각 8개(가로 1,000·세로 1,400px)까지
export const MAX_IMAGE_BASE64_LENGTH = 4_000_000;
export const MAX_TOTAL_IMAGE_BASE64_LENGTH = 16_000_000;
const IMAGE_MEDIA_TYPES: ProcessImageMediaType[] = ['image/jpeg', 'image/png', 'image/webp'];
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProcessOutcome {
  stopReason: string | null;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
  result: unknown;
}

export interface HiringProcessDeps {
  getUserId(): Promise<string | null>;
  hasApplication(applicationId: string): Promise<boolean>; // 요청자 권한(RLS)으로 → 남의 지원은 false
  findProcess(postingHash: string): Promise<ProcessStep[] | null>;
  consumeQuota(userId: string, limit: number): Promise<boolean>;
  releaseQuota(userId: string): Promise<void>;
  readProcess(request: ReturnType<typeof buildProcessRequest>): Promise<ProcessOutcome>;
  saveProcess(row: { postingHash: string; steps: ProcessStep[]; model: string; usage: ProcessOutcome['usage']; costUsd: number }): Promise<void>;
  sha256(text: string): Promise<string>;
  logError(message: string, detail?: unknown): void;
}

type Reply = { status: number; body: Record<string, unknown> };
const fail = (status: number, code: string, error: string): Reply => ({ status, body: { code, error } });

interface ParsedBody {
  applicationId: string;
  text: string;
  images: Array<{ mediaType: ProcessImageMediaType; data: string }>;
}

function parseBody(raw: unknown): ParsedBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;
  const applicationId = typeof body.applicationId === 'string' ? body.applicationId : '';
  const text = typeof body.text === 'string' ? body.text : '';
  const rawImages = Array.isArray(body.images) ? body.images : [];
  if (!UUID.test(applicationId) || text.length > MAX_PROCESS_TEXT_LENGTH || rawImages.length > MAX_PROCESS_IMAGES) return null;
  const images: ParsedBody['images'] = [];
  let total = 0;
  for (const item of rawImages) {
    const mediaType = (item as { mediaType?: unknown })?.mediaType;
    const data = (item as { data?: unknown })?.data;
    if (!IMAGE_MEDIA_TYPES.includes(mediaType as ProcessImageMediaType) || typeof data !== 'string') return null;
    if (data.length > MAX_IMAGE_BASE64_LENGTH || !BASE64.test(data)) return null;
    total += data.length;
    images.push({ mediaType: mediaType as ProcessImageMediaType, data });
  }
  if (total > MAX_TOTAL_IMAGE_BASE64_LENGTH) return null;
  if (!text.trim() && images.length === 0) return null;
  return { applicationId, text, images };
}

export async function handleHiringProcess(deps: HiringProcessDeps, raw: unknown): Promise<Reply> {
  // 1) 로그인·입력·본인 지원
  const userId = await deps.getUserId();
  if (!userId) return fail(401, 'unauthorized', '로그인이 필요해요.');
  const input = parseBody(raw);
  if (!input) return fail(400, 'bad_request', '요청 형식이 올바르지 않아요.');
  if (!(await deps.hasApplication(input.applicationId))) return fail(404, 'not_found', '지원 내역을 찾지 못했어요.');

  // 2) 같은 공고(지시문 버전·모델·글·이미지가 같음)는 저장된 결과를 쓴다. 한도를 쓰지 않는다
  const postingHash = await deps.sha256([PROCESS_PROMPT_VERSION, PROCESS_MODEL, input.text.trim(), ...input.images.map((image) => image.data)].join('\n'));
  const cached = await deps.findProcess(postingHash);
  if (cached) return { status: 200, body: { steps: cached, cached: true } };

  // 3) 하루 한도 → AI
  if (!(await deps.consumeQuota(userId, PROCESS_DAILY_LIMIT))) {
    return fail(429, 'limit', '오늘은 전형 절차를 충분히 읽었어요. 내일 이어서 읽어요.');
  }
  let outcome: ProcessOutcome;
  try {
    outcome = await deps.readProcess(buildProcessRequest({ text: input.text, images: input.images }));
  } catch (error) {
    await deps.releaseQuota(userId);
    deps.logError('[hiring-process] AI 실패', error);
    return fail(502, 'ai_failed', '전형 절차를 읽지 못했어요.');
  }
  if (outcome.stopReason === 'refusal' || outcome.stopReason === 'max_tokens') {
    await deps.releaseQuota(userId);
    deps.logError('[hiring-process] 결과 없음', { stopReason: outcome.stopReason });
    return fail(502, 'ai_failed', '전형 절차를 읽지 못했어요.');
  }

  // 4) 정리해 저장(빈 절차도 저장해 같은 공고를 다시 부르지 않는다)
  const steps = normalizeProcess(outcome.result);
  await deps.saveProcess({ postingHash, steps, model: outcome.model, usage: outcome.usage, costUsd: estimateProcessCostUsd(outcome.usage) });
  return { status: 200, body: { steps, cached: false } };
}
