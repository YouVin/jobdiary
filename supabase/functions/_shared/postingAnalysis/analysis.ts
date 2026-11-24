import { STRENGTHS, STRENGTH_LABELS } from './strengths.ts';

// 공고 분석 요청 만들기·결과 검사·비용 계산 (#226, 결정 기록 001·002).
// Edge Function(company-info)과 측정 스크립트(apps/web/scripts/eval-posting-analysis.mjs)가 이 파일을 같이 써서,
// 잰 것과 실제 서비스가 달라지지 않게 한다. SDK·Deno 전역을 쓰지 않는 순수 함수만 두어 Node 테스트로도 검증한다.
// Deno가 읽으므로 상대 경로는 확장자(.ts)까지 적는다.

export type AnalysisVariant = 'baseline' | 'lean';
export type AnalysisModel = 'claude-haiku-5-5' | 'claude-sonnet-5-5' | 'claude-opus-5-5';

export interface AnalysisInput {
  companyName: string;
  postingText: string;
  facts?: Record<string, string | number>; // 공고 기업정보·국민연금·DART에서 받은 값 (화면에 바로 보여 줄 숫자)
  homepageText?: string;
}

export interface AnalysisStrength {
  strength: string;
  quote: string;
  reason: string;
  prepQuestion: string;
}

export interface AnalysisResult {
  companySummary: string;
  hasTalentStatement: boolean;
  strengths: AnalysisStrength[];
  skills: { required: string[]; preferred: string[] };
}

// 결과 형식(JSON 스키마). 강점 이름은 고정 목록만 허용한다.
export const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    companySummary: { type: 'string' },
    hasTalentStatement: { type: 'boolean' },
    strengths: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          strength: { type: 'string', enum: STRENGTH_LABELS },
          quote: { type: 'string' },
          reason: { type: 'string' },
          prepQuestion: { type: 'string' },
        },
        required: ['strength', 'quote', 'reason', 'prepQuestion'],
        additionalProperties: false,
      },
    },
    skills: {
      type: 'object',
      properties: {
        required: { type: 'array', items: { type: 'string' } },
        preferred: { type: 'array', items: { type: 'string' } },
      },
      required: ['required', 'preferred'],
      additionalProperties: false,
    },
  },
  required: ['companySummary', 'hasTalentStatement', 'strengths', 'skills'],
  additionalProperties: false,
};

const STRENGTH_GUIDE = STRENGTHS.map((strength) => `- ${strength.label}: ${strength.hint}`).join('\n');

const COMMON_RULES = `너는 취업 준비생의 면접 준비를 돕는다. 채용 공고에서 회사가 원하는 인재상과 기술을 정리한다.

규칙:
- strengths의 strength에는 아래 목록의 이름만 쓴다.
${STRENGTH_GUIDE}
- quote는 공고 본문에서 그대로 복사한 연속된 부분이다. 고치거나 요약하거나 줄임표를 넣지 않는다. 공고에 없는 내용으로 강점을 만들지 않는다.
- 공고에 인재상·자격·우대 문장이 없어 근거를 찾을 수 없으면 hasTalentStatement를 false로 두고 strengths는 빈 배열로 둔다.
- skills.required에는 자격 요건(필수)에 나온 기술, skills.preferred에는 우대 사항에 나온 기술을 이름만 쓴다(예: React, TypeScript).
- prepQuestion은 지원자가 자기 경험으로 답을 준비할 면접 질문 한 문장이다.
- 회사에 대해서는 주어진 회사 자료와 홈페이지 본문에 있는 내용만 쓴다. 없으면 쓰지 않는다.
- 문장은 한국어 해요체로 짧게 쓴다.`;

// 비용 절감 전(baseline)과 후(lean). 다른 점: 회사 숫자 다시 쓰기, 강점 개수·인용 길이, 생각 깊이, 입력 다듬기.
const VARIANT_RULES: Record<AnalysisVariant, string> = {
  baseline: `- companySummary는 회사 소개를 3~5문장으로 자세히 쓴다. 회사 자료의 직원 수·설립 연도·위치 같은 숫자도 문장에 넣는다.
- 공고에서 찾을 수 있는 강점은 모두 쓴다. quote에는 근거가 되는 문장 전체를 쓴다.`,
  lean: `- companySummary는 회사가 하는 일을 한 문장(60자 이내)으로만 쓴다. 직원 수·설립 연도·주소 같은 숫자는 화면에 따로 보여 주므로 쓰지 않는다.
- strengths는 근거가 가장 분명한 것부터 최대 5개만 쓴다. quote는 근거가 되는 핵심 구절만 100자 이내로 쓴다.
- reason과 prepQuestion은 각각 한 문장으로 쓴다.`,
};

export function buildSystemPrompt(variant: AnalysisVariant): string {
  return `${COMMON_RULES}\n${VARIANT_RULES[variant]}`;
}

// 강점 분석에 쓰지 않는 공고 칸. 이 제목 아래 줄은 lean에서 보내지 않는다.
const DROP_HEADINGS = [
  '복리후생', '복지', '혜택', '근무조건', '근무지', '근무위치', '근무장소', '위치', '오시는길', '지원방법', '접수방법', '접수기간',
  '전형절차', '채용절차', '채용과정', '전형과정', '제출서류', '유의사항', '참고사항', '기타사항', '기타', '문의',
];
// 다시 보내기 시작하는 공고 칸
const KEEP_HEADINGS = [
  '주요업무', '담당업무', '업무내용', '자격요건', '지원자격', '필수', '우대사항', '우대', '인재상', '이런분', '이런분을',
  '함께', '팀소개', '회사소개', '기술스택', '사용기술', '모집부문', '모집분야',
];
const HEADING_PREFIX = /^[\s[\]【】()<>■□●○◆◇▶▷►•·\-#*✔✅📌☑︎0-9.:]+/u;
// 제목 표시: 줄 앞의 기호·번호(■, [, 1. 등) 또는 줄 끝의 쌍점
const HEADING_MARKER = /^\s*(?:[[【■□●○◆◇▶▷►•#*✔✅📌☑<(]|\d+[.)])|[:：]\s*$/u;

// 제목 줄인지 본다. 표시가 있으면 앞부분이 맞는지("복리후생 및 혜택"), 표시가 없으면 제목과 정확히 같은지만 본다.
// 표시 없이 앞부분만 보면 "위치 기반 서비스 개발" 같은 본문 줄을 "위치" 칸으로 잘못 읽어 내용을 지운다.
function headingKind(line: string): 'drop' | 'keep' | null {
  const compact = line.replace(HEADING_PREFIX, '').replace(/[\s:：\]】)>]/g, '');
  if (!compact || compact.length > 20) return null;
  const marked = HEADING_MARKER.test(line);
  const matches = (heading: string) => (marked ? compact.startsWith(heading) : compact === heading);
  for (const heading of DROP_HEADINGS) {
    if (matches(heading)) return 'drop';
  }
  for (const heading of KEEP_HEADINGS) {
    if (matches(heading)) return 'keep';
  }
  return null;
}

// 공고 다듬기: 복리후생·지원 방법·전형 절차처럼 강점 분석에 필요 없는 칸을 뺀다. 줄 내용은 고치지 않는다
// (인용이 원문에 그대로 있어야 하므로).
export function trimPosting(text: string): string {
  const kept: string[] = [];
  let dropping = false;
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const kind = headingKind(line);
    if (kind === 'drop') {
      dropping = true;
      continue;
    }
    if (kind === 'keep') dropping = false;
    if (!dropping) kept.push(line);
  }
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export const HOMEPAGE_LIMIT_LEAN = 2000;

function factsText(facts: AnalysisInput['facts']): string {
  if (!facts) return '';
  const lines: string[] = [];
  for (const [key, value] of Object.entries(facts)) lines.push(`- ${key}: ${value}`);
  return lines.join('\n');
}

export function buildUserContent(input: AnalysisInput, variant: AnalysisVariant): string {
  const posting = variant === 'lean' ? trimPosting(input.postingText) : input.postingText.trim();
  const homepage = input.homepageText?.replace(/\s+/g, ' ').trim() ?? '';
  const parts = [`[회사 이름]\n${input.companyName}`];
  const facts = factsText(input.facts);
  if (facts) parts.push(`[회사 자료]\n${facts}`);
  if (homepage) parts.push(`[홈페이지 본문]\n${variant === 'lean' ? homepage.slice(0, HOMEPAGE_LIMIT_LEAN) : homepage}`);
  parts.push(`[공고 본문]\n${posting}`);
  return parts.join('\n\n');
}

export const MAX_OUTPUT_TOKENS = 8000;

// Messages API 요청 본문. thinking은 보내지 않는다(세 모델 모두 생략하면 adaptive).
// lean은 생각 깊이(effort)를 low로 낮춰 출력 토큰을 줄인다. baseline은 모델 기본값.
export function buildAnalysisRequest(model: AnalysisModel, variant: AnalysisVariant, input: AnalysisInput) {
  const outputConfig: { format: { type: 'json_schema'; schema: typeof ANALYSIS_SCHEMA }; effort?: 'low' } = {
    format: { type: 'json_schema', schema: ANALYSIS_SCHEMA },
  };
  if (variant === 'lean') outputConfig.effort = 'low';
  return {
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: buildSystemPrompt(variant),
    messages: [{ role: 'user' as const, content: buildUserContent(input, variant) }],
    output_config: outputConfig,
  };
}

// ── 결과 검사 ──
function normalizeForQuote(value: string): string {
  return value.normalize('NFKC').replace(/^["'“”‘’「」『』\s]+|["'“”‘’「」『』\s]+$/g, '').replace(/\s+/g, ' ').trim();
}

// 인용이 공고 원문에 그대로 있는지. 공백·전각 차이만 무시한다.
export function verifyQuotes(result: AnalysisResult, postingText: string): { total: number; verified: number; missing: string[] } {
  const haystack = normalizeForQuote(postingText);
  const missing: string[] = [];
  let verified = 0;
  for (const item of result.strengths) {
    const quote = normalizeForQuote(item.quote);
    if (quote && haystack.includes(quote)) {
      verified += 1;
    } else {
      missing.push(item.quote);
    }
  }
  return { total: result.strengths.length, verified, missing };
}

// ── 비용 계산 (2026-11-24 공식 요금표, 100만 토큰당 USD) ──
interface ModelPrice {
  input: number;
  output: number;
  cacheReadMultiplier: number;
  long?: { threshold: number; input: number; output: number };
}

export const MODEL_PRICES: Record<AnalysisModel, ModelPrice> = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheReadMultiplier: 0.1, long: { threshold: 100_000, input: 0.5, output: 2.5 } },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheReadMultiplier: 0.05 },
  'claude-opus-5-5': { input: 4, output: 20, cacheReadMultiplier: 0.05 },
};

export const WEB_SEARCH_USD = 0.01; // 1,000번에 $10
export const USD_TO_KRW = 1400; // 대략 환율, 보고용

export interface UsageLike {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
}

export function estimateCostUsd(model: AnalysisModel, usage: UsageLike): number {
  const price = MODEL_PRICES[model];
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const promptTokens = usage.input_tokens + cacheWrite + cacheRead;
  const isLong = price.long !== undefined && promptTokens > price.long.threshold;
  const inputPrice = isLong && price.long ? price.long.input : price.input;
  const outputPrice = isLong && price.long ? price.long.output : price.output;
  const tokensUsd =
    (usage.input_tokens * inputPrice + cacheWrite * inputPrice * 1.25 + cacheRead * inputPrice * price.cacheReadMultiplier +
      usage.output_tokens * outputPrice) / 1_000_000;
  const searchUsd = (usage.server_tool_use?.web_search_requests ?? 0) * WEB_SEARCH_USD;
  return tokensUsd + searchUsd;
}
