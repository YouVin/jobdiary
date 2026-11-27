import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

// 공고 전형 절차 (#295): 글 규칙 읽기, 종류, 지원 단계 잇기, 서버 처리 순서.
const load = createSourceLoader();
const { extractProcessFromText, kindOfStep, parseProcessInput, formatProcessInput, statusForStep, getCurrentStepIndex, needsProcess } = load('@/utils/hiringProcess');
const shared = load('../../supabase/functions/_shared/hiringProcess/process.ts');
const { handleHiringProcess, PROCESS_DAILY_LIMIT } = load('../../supabase/functions/_shared/hiringProcess/handler.ts');

const names = (steps) => steps.map((step) => `${step.name}:${step.kind}`);

test('글로 적힌 절차를 규칙으로 읽는다 (사용자가 보낸 실제 공고 모양)', () => {
  // 데일리페이: 머리말 아래 줄에 > 로 이어짐
  assert.deepEqual(names(extractProcessFromText('[Dailypay Culture]\n복지\n전형절차\n· 서류전형 > 1차면접 > 2차면접 > 최종합격\n· 면접일정은 추후 통보됩니다.\n유의사항')), ['서류전형:document', '1차면접:interview', '2차면접:interview', '최종합격:final']);
  // 크럭스데이터: "채용절차" 아래 여러 줄 중 "전형절차 : … → …"
  const crux = '근무조건\n🚀 채용절차\n• 접수기간 : 2026-10-12 10시 ~ 상시\n• 제출서류 : 사람인 온라인 이력서, 경력의 경우 고용보험상실확인서(면접시 제출)\n• 접수방법 : 사람인 입사지원\n• 전형절차 : 서류전형 → 1차면접 → 2차면접 → 최종합격\n유의사항';
  assert.deepEqual(names(extractProcessFromText(crux)), ['서류전형:document', '1차면접:interview', '2차면접:interview', '최종합격:final']);
  // 번호 줄: 1. 서류 접수 : 설명 …
  const numbered = '채용전형\n1\n서류 접수\n2\n사전\n설문조사\n1. 서류 접수 : 이력서, 포트폴리오 등 서류를 제출해주세요.\n2. 사전 설문조사 : 지원 동기 등을 알아보기 위한 설문조사를 진행합니다.\n3. 1차 인터뷰 : 실무진과 함께 합니다.\n4. 과제 전형 : 기술 역량을 확인합니다.\n5. 2차 인터뷰 : 경영진과 함께 합니다.\n6. 처우 협의와 채용 : 첫 3개월은 수습기간입니다.\n';
  assert.deepEqual(names(extractProcessFromText(numbered)), ['서류 접수:document', '사전 설문조사:test', '1차 인터뷰:interview', '과제 전형:test', '2차 인터뷰:interview', '처우 협의와 채용:final']);
  // 절차가 없거나 한 단계뿐이면 못 찾은 것으로(→ 이미지가 있으면 AI)
  assert.deepEqual(extractProcessFromText('자격요건\n- React 경험\n우대사항 > TypeScript'), []);
  assert.deepEqual(extractProcessFromText('전형절차\n추후 안내'), []);
});

test('단계 이름으로 종류를 정한다', () => {
  assert.equal(kindOfStep('최종 면접'), 'interview');
  assert.equal(kindOfStep('임원 인터뷰(오프라인)'), 'interview');
  assert.equal(kindOfStep('코딩테스트'), 'test');
  assert.equal(kindOfStep('인적성 검사'), 'test');
  assert.equal(kindOfStep('서류 합격 발표'), 'document');
  assert.equal(kindOfStep('결과 발표 (처우 협의)'), 'final');
  assert.equal(kindOfStep('레퍼런스 체크'), 'test');
});

test('직접 고친 한 줄을 단계로', () => {
  const steps = parseProcessInput('서류 > 코딩테스트 > 1차 면접 >  > 최종 합격');
  assert.deepEqual(names(steps), ['서류:document', '코딩테스트:test', '1차 면접:interview', '최종 합격:final']);
  assert.equal(formatProcessInput(steps), '서류 > 코딩테스트 > 1차 면접 > 최종 합격');
});

test('단계 ↔ 지원 단계: 고른 단계가 맞으면 그대로(1차·2차 면접 구분), 바뀌었으면 다시 찾는다', () => {
  const steps = parseProcessInput('서류 접수 > 코딩테스트 > 1차 면접 > 2차 면접 > 처우 협의 > 최종 합격');
  assert.deepEqual(steps.map(statusForStep), ['applied', 'screening', 'interview', 'interview', 'interviewed', 'offer']);
  const app = (status, step, extra = {}) => ({ id: 'a', status, url: 'https://x', hiringProcess: { steps, source: 'text', step, checkedAt: '' }, statusHistory: [], ...extra });
  assert.equal(getCurrentStepIndex(app('interview', 3), steps), 3, '2차 면접을 고른 그대로');
  assert.equal(getCurrentStepIndex(app('interview', 1), steps), 2, '보드에서 면접으로 옮겼으면 첫 면접');
  assert.equal(getCurrentStepIndex(app('applied'), steps), 0);
  assert.equal(getCurrentStepIndex(app('interviewed'), steps), 4, '결과 기다림 단계');
  assert.equal(getCurrentStepIndex(app('offer'), steps), 5);
  // 끝난 지원은 탈락 전 단계
  assert.equal(getCurrentStepIndex(app('rejected', undefined, { statusHistory: [{ from: 'interview', to: 'rejected', at: '2026-11-20T00:00:00Z' }] }), steps), 2);
  // 테스트 없는 절차에서 서류 통과 → 마지막 서류 단계
  const simple = parseProcessInput('서류전형 > 1차면접 > 최종합격');
  assert.equal(getCurrentStepIndex({ status: 'screening', hiringProcess: { steps: simple }, statusHistory: [] }, simple), 0);
});

test('읽을 지원: 공고 주소가 있고 아직 안 읽은 진행 중 지원만', () => {
  assert.equal(needsProcess({ status: 'applied', url: 'https://x', hiringProcess: null }), true);
  assert.equal(needsProcess({ status: 'applied', url: 'https://x' }), true);
  assert.equal(needsProcess({ status: 'applied', url: '', hiringProcess: null }), false);
  assert.equal(needsProcess({ status: 'rejected', url: 'https://x', hiringProcess: null }), false);
  assert.equal(needsProcess({ status: 'applied', url: 'https://x', hiringProcess: { steps: [], source: 'none' } }), false);
});

test('AI 결과 정리: 번호·기호 빼기, 모르는 종류·빈 이름 버리기, 연달아 같은 이름은 하나로, 10개까지', () => {
  const steps = shared.normalizeProcess({ steps: [
    { name: 'STEP 01 서류 전형', kind: 'document' }, { name: '서류 전형', kind: 'document' }, { name: '  1. 실무   인터뷰 ', kind: 'interview' },
    { name: '', kind: 'final' }, { name: '이상한', kind: 'other' }, { name: '최종 합격', kind: 'final' },
  ] });
  assert.deepEqual(names(steps), ['서류 전형:document', '실무 인터뷰:interview', '최종 합격:final']);
  assert.deepEqual(shared.normalizeProcess(null), []);
  assert.equal(shared.normalizeProcess({ steps: Array.from({ length: 15 }, (_, i) => ({ name: `면접 ${i}`, kind: 'interview' })) }).length, 10);
  assert.ok(shared.estimateProcessCostUsd({ input_tokens: 2000, output_tokens: 100 }) < 0.0003);
});

function deps(overrides = {}) {
  const calls = [];
  const base = {
    getUserId: async () => 'user-1',
    hasApplication: async () => true,
    findProcess: async () => null,
    consumeQuota: async () => true,
    releaseQuota: async () => { calls.push('release'); },
    readProcess: async () => ({ stopReason: 'end_turn', model: 'claude-haiku-5-5', usage: { input_tokens: 2000, output_tokens: 80 }, result: { steps: [{ name: '서류', kind: 'document' }, { name: '면접', kind: 'interview' }] } }),
    saveProcess: async (row) => { calls.push(['save', row.steps.length]); },
    sha256: async (text) => `hash-${text.length}`,
    logError: () => {},
  };
  return { deps: { ...base, ...overrides }, calls };
}
const BODY = { applicationId: '00000000-0000-4000-8000-000000000001', text: '', images: [{ mediaType: 'image/jpeg', data: 'QUJD' }] };

test('서버: 로그인·입력·본인 지원을 먼저 보고, 같은 공고는 한도 없이 재사용한다', async () => {
  assert.equal((await handleHiringProcess(deps({ getUserId: async () => null }).deps, BODY)).status, 401);
  assert.equal((await handleHiringProcess(deps().deps, { ...BODY, images: [], text: '' })).status, 400, '글도 이미지도 없음');
  assert.equal((await handleHiringProcess(deps().deps, { ...BODY, applicationId: 'x' })).status, 400);
  assert.equal((await handleHiringProcess(deps().deps, { ...BODY, images: [{ mediaType: 'image/svg+xml', data: 'QUJD' }] })).status, 400);
  assert.equal((await handleHiringProcess(deps({ hasApplication: async () => false }).deps, BODY)).status, 404);
  let consumed = false;
  const cached = await handleHiringProcess(deps({ findProcess: async () => [{ name: '서류', kind: 'document' }], consumeQuota: async () => { consumed = true; return true; } }).deps, BODY);
  assert.deepEqual([cached.status, cached.body.cached, consumed], [200, true, false]);
});

test('서버: 한도 → AI → 정리·저장, 실패하면 한도를 되돌린다', async () => {
  let limit = 0;
  const ok = deps({ consumeQuota: async (_, value) => { limit = value; return true; } });
  const reply = await handleHiringProcess(ok.deps, BODY);
  assert.equal(reply.status, 200);
  assert.equal(reply.body.steps.length, 2);
  assert.equal(limit, PROCESS_DAILY_LIMIT);
  assert.deepEqual(ok.calls, [['save', 2]]);

  assert.equal((await handleHiringProcess(deps({ consumeQuota: async () => false }).deps, BODY)).status, 429);
  const thrown = deps({ readProcess: async () => { throw new Error('network'); } });
  assert.equal((await handleHiringProcess(thrown.deps, BODY)).status, 502);
  assert.deepEqual(thrown.calls, ['release']);
  const refused = deps({ readProcess: async () => ({ stopReason: 'refusal', model: 'm', usage: { input_tokens: 1, output_tokens: 0 }, result: null }) });
  assert.equal((await handleHiringProcess(refused.deps, BODY)).status, 502);
  assert.deepEqual(refused.calls, ['release']);
  // 절차가 없는 공고도 빈 절차로 저장해 다시 부르지 않는다
  const empty = deps({ readProcess: async () => ({ stopReason: 'end_turn', model: 'm', usage: { input_tokens: 1, output_tokens: 1 }, result: { steps: [] } }) });
  assert.deepEqual((await handleHiringProcess(empty.deps, BODY)).body.steps, []);
  assert.deepEqual(empty.calls, [['save', 0]]);
});

test('DB: 공고별 결과·횟수는 브라우저가 못 읽고, 지원 칸은 10단계·4KB까지', () => {
  const sql = fs.readFileSync('../../supabase/migrations/20261127120000_hiring_process.sql', 'utf8');
  assert.match(sql, /add column hiring_process jsonb/);
  assert.match(sql, /jsonb_array_length\(hiring_process -> 'steps'\) <= 10/);
  assert.match(sql, /revoke all on table public\.posting_processes, public\.process_usage from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.consume_process_quota\(uuid, integer\), public\.release_process_quota\(uuid\) to service_role/);
  assert.doesNotMatch(sql, /to authenticated/);
  assert.match(sql, /where usage\.count < p_limit/);
});
