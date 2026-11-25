import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

const load = createSourceLoader();
const {
  trimPosting, verifyQuotes, estimateCostUsd, buildAnalysisRequest, ANALYSIS_SCHEMA, buildUserContent, HOMEPAGE_LIMIT_LEAN,
} = load('../../supabase/functions/_shared/postingAnalysis/analysis.ts');
const { STRENGTH_LABELS } = load('../../supabase/functions/_shared/postingAnalysis/strengths.ts');

const POSTING = [
  '[주요 업무]',
  '- 위치 기반 서비스 개발',
  '- 사용자 화면을 React로 만들어요',
  '',
  '■ 자격 요건',
  '- TypeScript 실무 경험',
  '- 다양한 직군의 팀원들과 원활하게 소통하는 분',
  '',
  '■ 복리후생 및 혜택',
  '- 점심 식대 지원',
  '- 자기계발비',
  '',
  '[우대 사항]',
  '- Next.js 경험',
  '',
  '전형 절차:',
  '서류 → 과제 → 면접',
].join('\n');

test('공고 다듬기는 복리후생·전형 절차 칸만 빼고, 본문 줄은 고치지 않는다', () => {
  const trimmed = trimPosting(POSTING);
  assert.ok(trimmed.includes('- 위치 기반 서비스 개발'), '"위치"로 시작하는 본문 줄을 제목으로 착각하지 않는다');
  assert.ok(trimmed.includes('- TypeScript 실무 경험'));
  assert.ok(trimmed.includes('- Next.js 경험'), '복리후생 뒤의 우대 사항 칸은 다시 보낸다');
  assert.ok(!trimmed.includes('점심 식대'));
  assert.ok(!trimmed.includes('서류 → 과제'));
  assert.ok(trimmed.length < POSTING.length);
});

test('인용 검사는 공백·전각·따옴표 차이만 무시하고, 원문에 없는 인용은 잡아낸다', () => {
  const result = {
    company: { about: '', products: [], website: '' }, hasTalentStatement: true, workplace: { location: '', workDays: '', workHours: '' },
    strengths: [
      { strength: '소통', quote: '“다양한 직군의 팀원들과  원활하게 소통하는 분”', wants: '', experiences: [] },
      { strength: '주도성', quote: '스스로 문제를 찾아 해결하는 분', wants: '', experiences: [] },
    ],
  };
  const check = verifyQuotes(result, POSTING);
  assert.deepEqual([check.total, check.verified], [2, 1]);
  assert.deepEqual(check.missing, ['스스로 문제를 찾아 해결하는 분']);
});

test('비용은 공식 요금표로 계산하고, Haiku 5.5는 10만 토큰을 넘으면 비싼 요금을 쓴다', () => {
  const usage = { input_tokens: 10_000, output_tokens: 3_000 };
  assert.equal(estimateCostUsd('claude-haiku-5-5', usage).toFixed(6), '0.002500');
  assert.equal(estimateCostUsd('claude-sonnet-5-5', usage).toFixed(4), '0.0500');
  assert.equal(estimateCostUsd('claude-opus-5-5', usage).toFixed(4), '0.1000');
  assert.equal(estimateCostUsd('claude-haiku-5-5', { input_tokens: 120_000, output_tokens: 0 }).toFixed(4), '0.0600');
  assert.equal(estimateCostUsd('claude-haiku-5-5', { input_tokens: 0, output_tokens: 0, server_tool_use: { web_search_requests: 2 } }), 0.02);
});

test('lean은 생각 깊이를 낮추고 입력을 다듬으며, 강점 이름은 고정 목록만 허용한다', () => {
  const input = { companyName: '루트랩스', postingText: POSTING, facts: { 직원수: 18 }, homepageText: '가'.repeat(5000) };
  const baseline = buildAnalysisRequest('claude-haiku-5-5', 'baseline', input);
  const lean = buildAnalysisRequest('claude-haiku-5-5', 'lean', input);
  assert.equal(baseline.output_config.effort, undefined);
  assert.equal(lean.output_config.effort, 'low');
  assert.ok(lean.messages[0].content.length < baseline.messages[0].content.length);
  assert.ok(!buildUserContent(input, 'lean').includes('가'.repeat(HOMEPAGE_LIMIT_LEAN + 1)));
  assert.deepEqual(ANALYSIS_SCHEMA.properties.strengths.items.properties.strength.enum, STRENGTH_LABELS);
  assert.equal(STRENGTH_LABELS.length, 12);
});

test('근무지·근무 조건 칸은 화면에 보여 주므로 공고 다듬기에서 빼지 않는다 (#235)', () => {
  const posting = ['■ 복리후생', '- 식대 지원', '', '■ 근무 조건', '- 주 5일(월~금), 10:00~19:00', '', '■ 근무지', '- 서울 서초구 동산로 13'].join('\n');
  const trimmed = trimPosting(posting);
  assert.ok(!trimmed.includes('식대'));
  assert.ok(trimmed.includes('주 5일(월~금), 10:00~19:00'));
  assert.ok(trimmed.includes('서울 서초구 동산로 13'));
});
