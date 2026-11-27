// 전형 절차 읽기 (#295). 공고에서 "서류 → 코딩테스트 → 1차 면접 → 최종 합격" 같은 절차만 뽑는다.
// 글로 적힌 공고는 웹이 규칙으로 먼저 뽑고(비용 0), 이미지뿐이거나 규칙으로 못 찾은 공고만 이 요청을 쓴다.
// 강점 분석(postingAnalysis)과 따로 둔다: 가져올 때 모든 지원에 돌리므로 지시문·결과 형식·출력을 가장 작게 한다.
// Deno(Edge Function)와 Node 테스트가 같이 읽는다.

export const PROCESS_PROMPT_VERSION = '2026-11-27.1';
export const PROCESS_MODEL = 'claude-haiku-5-5';
export const PROCESS_MAX_OUTPUT_TOKENS = 1024;
export const MAX_PROCESS_STEPS = 10;
export const MAX_STEP_NAME_LENGTH = 30;

// 단계 종류: 화면 트랙은 공고 이름 그대로 보여 주고, 통계(지원 단계)는 종류로 센다.
export const STEP_KINDS = ['document', 'test', 'interview', 'final'] as const;
export type StepKind = (typeof STEP_KINDS)[number];

export interface ProcessStep {
  name: string; // 공고에 적힌 이름 (예: 임원 인터뷰(오프라인))
  kind: StepKind;
}

export type ProcessImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

export interface ProcessInput {
  text: string; // 공고 페이지 글 (없으면 '')
  images: Array<{ mediaType: ProcessImageMediaType; data: string }>; // 본문 이미지 조각(base64)
}

export const PROCESS_SYSTEM_PROMPT = [
  '채용 공고에서 전형 절차(채용 절차, 채용 전형, 전형 과정)만 찾아 순서대로 적는다.',
  '- name: 공고에 적힌 단계 이름 그대로. "STEP 01"·"1."·화살표 같은 번호와 기호는 뺀다. 괄호 안 짧은 설명은 둔다.',
  '- kind: document(서류 접수·서류 전형), test(면접 전 평가: 코딩테스트·과제·인적성·필기·사전 설문조사·포트폴리오 심사), interview(면접·인터뷰·PT·컬처핏), final(최종 합격·결과 발표·처우 협의·입사).',
  '- 전형 절차가 공고에 없으면 steps는 빈 배열이다. 없는 단계를 추측해 만들지 않는다.',
  '- 자격 요건·복지 같은 다른 내용은 적지 않는다.',
].join('\n');

export const PROCESS_SCHEMA = {
  type: 'object',
  properties: {
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, kind: { type: 'string', enum: [...STEP_KINDS] } },
        required: ['name', 'kind'],
        additionalProperties: false,
      },
    },
  },
  required: ['steps'],
  additionalProperties: false,
} as const;

// 공고 글은 앞뒤가 길어도 절차는 대개 뒤쪽 한 줄이라 통째로 보낸다(규칙으로 못 찾은 글만 온다). 너무 길면 자른다.
const MAX_TEXT_LENGTH = 12_000;

export function buildProcessRequest(input: ProcessInput) {
  const content: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: ProcessImageMediaType; data: string } }> = [];
  const text = input.text.trim().slice(0, MAX_TEXT_LENGTH);
  if (text) content.push({ type: 'text', text: `[공고 글]\n${text}` });
  for (const image of input.images) content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } });
  content.push({ type: 'text', text: input.images.length > 0 ? `위 이미지 ${input.images.length}장도 공고 본문이다(위에서 아래 순서). 전형 절차만 적는다.` : '전형 절차만 적는다.' });
  return {
    model: PROCESS_MODEL,
    max_tokens: PROCESS_MAX_OUTPUT_TOKENS,
    system: PROCESS_SYSTEM_PROMPT,
    messages: [{ role: 'user' as const, content }],
    output_config: { format: { type: 'json_schema' as const, schema: PROCESS_SCHEMA }, effort: 'low' as const },
  };
}

// 결과 정리: 이름 다듬기·길이·개수 제한, 모르는 종류·빈 이름은 버리고, 같은 이름이 연달아 나오면 하나로.
export function normalizeProcess(value: unknown): ProcessStep[] {
  const raw = value && typeof value === 'object' ? (value as { steps?: unknown }).steps : null;
  if (!Array.isArray(raw)) return [];
  const steps: ProcessStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const name = String((item as { name?: unknown }).name ?? '')
      .replace(/^\s*(step\s*\d+|\d+\s*[.)]|[>›→▶·•-])\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_STEP_NAME_LENGTH);
    const kind = (item as { kind?: unknown }).kind;
    if (!name || !STEP_KINDS.includes(kind as StepKind)) continue;
    if (steps.at(-1)?.name === name) continue;
    steps.push({ name, kind: kind as StepKind });
    if (steps.length === MAX_PROCESS_STEPS) break;
  }
  return steps;
}

// ── 비용 (Haiku 5.5 공식 요금, 100만 토큰당 USD: 입력 0.10 · 출력 0.50, 프롬프트 10만 토큰 이하) ──
export function estimateProcessCostUsd(usage: { input_tokens: number; output_tokens: number }): number {
  return (usage.input_tokens * 0.1 + usage.output_tokens * 0.5) / 1_000_000;
}
