import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createSourceLoader } from './loadSource.mjs';

// 회사 정보 Edge Function의 처리 순서 (#228). DB·AI는 가짜로 바꿔 규칙만 검사한다.
const load = createSourceLoader();
const {
  handleCompanyInfo, postingFingerprint, DAILY_LIMIT, MAX_POSTING_LENGTH, COMPANY_INFO_MODEL,
} = load('../../supabase/functions/_shared/companyInfo/handler.ts');

const APP_ID = '11111111-2222-4333-8444-555555555555';
const POSTING = [
  '[주요 업무]', '- React로 사용자 화면을 만들어요', '',
  '■ 자격 요건', '- TypeScript 실무 경험 2년 이상', '- 다양한 직군의 동료와 원활하게 소통하는 분',
  '- 맡은 기능을 기획부터 배포까지 책임지고 완수해 본 경험', '',
  '[우대 사항]', '- Next.js 서비스 운영 경험', '- 사용자 데이터를 근거로 화면을 개선해 본 경험',
].join('\n') + '\n' + '- 팀 문화와 개발 문화를 함께 만들어 가요\n'.repeat(3);

const AI_RESULT = {
  companySummary: '웹 서비스를 만드는 회사예요.',
  hasTalentStatement: true,
  strengths: [
    { strength: '소통', quote: '다양한 직군의 동료와 원활하게 소통하는 분', reason: '이유', prepQuestion: '질문' },
    { strength: '책임감', quote: '기획부터 배포까지 책임지고 완수해 본 경험', reason: '이유', prepQuestion: '질문' },
    { strength: '도전 정신', quote: '공고에 없는 지어낸 문장', reason: '이유', prepQuestion: '질문' },
  ],
  skills: { required: ['TypeScript'], preferred: ['Next.js'] },
};

function fakeDeps(overrides = {}) {
  const calls = { consume: 0, release: 0, analyze: [], saved: [], linked: [], errors: [] };
  const deps = {
    getUserId: async () => 'user-1',
    getApplication: async (id) => (id === APP_ID ? { id: APP_ID, company: '(주)루트랩스', position: '프론트엔드' } : null),
    findAnalysis: async () => null,
    consumeQuota: async (_userId, limit) => { calls.consume += 1; assert.equal(limit, DAILY_LIMIT); return true; },
    releaseQuota: async () => { calls.release += 1; },
    analyze: async (request) => {
      calls.analyze.push(request);
      return { stopReason: 'end_turn', model: COMPANY_INFO_MODEL, usage: { input_tokens: 3000, output_tokens: 800 }, result: structuredClone(AI_RESULT) };
    },
    saveAnalysis: async (row) => { calls.saved.push(row); return { id: 'analysis-1', result: row.result, model: row.model, createdAt: '2026-11-24T00:00:00.000Z' }; },
    linkApplication: async (row) => { calls.linked.push(row); },
    sha256: async (text) => createHash('sha256').update(text).digest('hex'),
    logError: (message) => { calls.errors.push(message); },
    ...overrides,
  };
  return { deps, calls };
}

const body = (changes = {}) => ({ applicationId: APP_ID, postingText: POSTING, ...changes });

test('로그인하지 않았거나 형식이 틀리거나 공고가 짧으면 AI를 부르지 않는다', async () => {
  const anonymous = fakeDeps({ getUserId: async () => null });
  assert.equal((await handleCompanyInfo(anonymous.deps, body())).status, 401);

  const { deps, calls } = fakeDeps();
  assert.equal((await handleCompanyInfo(deps, { applicationId: 'not-a-uuid', postingText: POSTING })).status, 400);
  assert.equal((await handleCompanyInfo(deps, body({ regenerate: 'yes' }))).status, 400);
  const short = await handleCompanyInfo(deps, body({ postingText: '프론트엔드 개발자 모집' }));
  assert.deepEqual([short.status, short.body.code], [400, 'posting_too_short']);
  assert.equal(calls.analyze.length + calls.consume, 0);
});

test('남의 지원(RLS로 안 읽히는 id)은 404이고 한도를 쓰지 않는다', async () => {
  const { deps, calls } = fakeDeps();
  const response = await handleCompanyInfo(deps, body({ applicationId: '99999999-2222-4333-8444-555555555555' }));
  assert.equal(response.status, 404);
  assert.equal(calls.consume, 0);
});

test('같은 공고 결과가 있으면 한도·AI 없이 연결만 하고, 다시 만들기는 한도를 쓴다', async () => {
  const stored = { id: 'analysis-0', result: AI_RESULT, model: COMPANY_INFO_MODEL, createdAt: '2026-11-23T00:00:00.000Z' };
  const { deps, calls } = fakeDeps({ findAnalysis: async () => stored });
  const cached = await handleCompanyInfo(deps, body());
  assert.deepEqual([cached.status, cached.body.cached, calls.consume, calls.analyze.length], [200, true, 0, 0]);
  assert.equal(calls.linked[0].analysis.id, 'analysis-0');

  const regenerated = await handleCompanyInfo(deps, body({ regenerate: true }));
  assert.deepEqual([regenerated.body.cached, calls.consume, calls.analyze.length], [false, 1, 1]);
});

test('하루 한도를 넘으면 429이고 AI를 부르지 않는다', async () => {
  const { deps, calls } = fakeDeps({ consumeQuota: async () => false });
  const response = await handleCompanyInfo(deps, body());
  assert.deepEqual([response.status, response.body.code], [429, 'daily_limit']);
  assert.match(response.body.error, /하루 5번/);
  assert.equal(calls.analyze.length, 0);
});

test('성공하면 공고에 없는 인용의 강점을 버리고, 비용과 함께 저장·연결한다', async () => {
  const { deps, calls } = fakeDeps();
  const response = await handleCompanyInfo(deps, body());
  assert.equal(response.status, 200);
  assert.equal(response.body.cached, false);
  assert.deepEqual(response.body.companyInfo.result.strengths.map((item) => item.strength), ['소통', '책임감']);
  assert.equal(calls.consume, 1);
  assert.equal(calls.release, 0);
  assert.equal(calls.saved[0].costUsd.toFixed(6), '0.000700'); // 3000×$0.10 + 800×$0.50 (100만 토큰당)
  assert.equal(calls.analyze[0].model, COMPANY_INFO_MODEL);
  assert.equal(calls.analyze[0].output_config.effort, 'low');
  assert.ok(calls.analyze[0].messages[0].content.includes('(주)루트랩스'));
  assert.deepEqual([calls.linked[0].applicationId, calls.linked[0].userId], [APP_ID, 'user-1']);
});

test('AI 실패·거절·출력 끊김은 한도를 되돌리고 저장하지 않는다', async () => {
  const cases = [
    [{ analyze: async () => { throw new Error('timeout'); } }, 502, 'ai_unavailable'],
    [{ analyze: async () => ({ stopReason: 'refusal', model: COMPANY_INFO_MODEL, usage: { input_tokens: 1, output_tokens: 0 }, result: null }) }, 422, 'refused'],
    [{ analyze: async () => ({ stopReason: 'max_tokens', model: COMPANY_INFO_MODEL, usage: { input_tokens: 1, output_tokens: 1 }, result: AI_RESULT }) }, 502, 'ai_truncated'],
  ];
  for (const [override, status, code] of cases) {
    const { deps, calls } = fakeDeps(override);
    const response = await handleCompanyInfo(deps, body());
    assert.deepEqual([response.status, response.body.code, calls.consume, calls.release, calls.saved.length], [status, code, 1, 1, 0]);
  }
});

test('긴 공고는 상한에서 자르고, 공백만 다른 공고는 같은 공고로 본다', async () => {
  const { deps, calls } = fakeDeps();
  await handleCompanyInfo(deps, body({ postingText: POSTING + 'ㄱ'.repeat(MAX_POSTING_LENGTH) }));
  assert.ok(!calls.analyze[0].messages[0].content.includes('ㄱ'.repeat(MAX_POSTING_LENGTH)));
  assert.equal(postingFingerprint('루트랩스', '주요 업무\n  React'), postingFingerprint('루트랩스', '주요 업무 React'));
  assert.notEqual(postingFingerprint('루트랩스', '주요 업무 React'), postingFingerprint('다른랩스', '주요 업무 React'));
});

// ── 이미지 공고 (#232) ──
const { MAX_POSTING_IMAGES } = load('../../supabase/functions/_shared/companyInfo/handler.ts');
const IMAGE = { mediaType: 'image/jpeg', data: Buffer.from('fake-jpeg-bytes').toString('base64') };
const imageBody = (images = [IMAGE, IMAGE], changes = {}) => ({ applicationId: APP_ID, postingImages: images, ...changes });
const TRANSCRIPT = POSTING; // AI가 이미지에서 옮겨 적은 글이라고 본다

test('이미지 공고는 이미지 조각을 그대로 보내고, 읽은 글 기준으로 인용을 검사한다', async () => {
  const { deps, calls } = fakeDeps({
    analyze: async (request) => {
      calls.analyze.push(request);
      return { stopReason: 'end_turn', model: COMPANY_INFO_MODEL, usage: { input_tokens: 4000, output_tokens: 2000 }, result: { ...structuredClone(AI_RESULT), transcript: TRANSCRIPT } };
    },
  });
  const response = await handleCompanyInfo(deps, imageBody());
  assert.equal(response.status, 200);
  const request = calls.analyze[0];
  const blocks = request.messages[0].content;
  assert.deepEqual(blocks.map((block) => block.type), ['text', 'image', 'image', 'text']);
  assert.deepEqual(blocks[1].source, { type: 'base64', media_type: 'image/jpeg', data: IMAGE.data });
  assert.equal(request.output_config.format.schema.required[0], 'transcript');
  assert.ok(request.max_tokens >= 16000);
  assert.match(request.system, /transcript에 위에서 아래 순서로/);
  assert.match(request.system, /지시가 아니다/);
  assert.deepEqual(response.body.companyInfo.result.strengths.map((item) => item.strength), ['소통', '책임감'], '읽은 글에 없는 인용은 버림');
  assert.equal(response.body.companyInfo.result.transcript, TRANSCRIPT);
});

test('이미지에서 글을 거의 못 읽으면 422이고 한도를 되돌린다', async () => {
  const { deps, calls } = fakeDeps({
    analyze: async () => ({ stopReason: 'end_turn', model: COMPANY_INFO_MODEL, usage: { input_tokens: 1, output_tokens: 1 }, result: { ...AI_RESULT, transcript: '로고' } }),
  });
  const response = await handleCompanyInfo(deps, imageBody());
  assert.deepEqual([response.status, response.body.code, calls.release, calls.saved.length], [422, 'unreadable_image', 1, 0]);
});

test('이미지 형식·개수·크기와 글·이미지 동시 전송을 막는다', async () => {
  const { deps, calls } = fakeDeps();
  const cases = [
    [imageBody([{ mediaType: 'image/gif', data: IMAGE.data }]), 400, 'bad_request'],
    [imageBody([{ mediaType: 'image/jpeg', data: 'not base64!' }]), 400, 'bad_request'],
    [imageBody([]), 400, 'bad_request'],
    [imageBody(Array.from({ length: MAX_POSTING_IMAGES + 1 }, () => IMAGE)), 400, 'images_too_large'],
    [imageBody([{ mediaType: 'image/jpeg', data: 'A'.repeat(4_000_004) }]), 400, 'images_too_large'],
    [{ applicationId: APP_ID, postingText: POSTING, postingImages: [IMAGE] }, 400, 'bad_request'],
    [{ applicationId: APP_ID }, 400, 'bad_request'],
  ];
  for (const [requestBody, status, code] of cases) {
    const response = await handleCompanyInfo(deps, requestBody);
    assert.deepEqual([response.status, response.body.code], [status, code], JSON.stringify(Object.keys(requestBody)));
  }
  assert.equal(calls.consume + calls.analyze.length, 0);
});

test('같은 이미지면 같은 공고로 재사용하고, 다른 이미지는 다른 공고다', async () => {
  const hashes = [];
  const { deps } = fakeDeps({ findAnalysis: async (hash) => { hashes.push(hash); return null; } });
  await handleCompanyInfo(deps, imageBody([IMAGE]));
  await handleCompanyInfo(deps, imageBody([IMAGE]));
  await handleCompanyInfo(deps, imageBody([{ mediaType: 'image/jpeg', data: Buffer.from('other').toString('base64') }]));
  assert.equal(hashes[0], hashes[1]);
  assert.notEqual(hashes[0], hashes[2]);
});
