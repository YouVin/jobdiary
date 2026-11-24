import assert from 'node:assert/strict';
import test from 'node:test';
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { createSourceLoader } from './loadSource.mjs';

// 회사 정보 화면용 데이터 변환·오류 문구 (#229). Supabase 호출 부분은 브라우저 검증(verify-company-info-browser)이 맡는다.
const load = createSourceLoader();
const { parseCompanyInfo, companyInfoErrorMessage, COMPANY_INFO_MIN_LENGTH, COMPANY_INFO_MAX_LENGTH, COMPANY_INFO_DAILY_LIMIT } = load('@/lib/companyInfoApi');
const server = load('../../supabase/functions/_shared/companyInfo/handler.ts');

test('서버 결과(JSON)를 화면 형식으로 옮기고, 모양이 틀린 강점·기술은 버린다', () => {
  const info = parseCompanyInfo({
    companySummary: '웹 서비스 회사예요.',
    hasTalentStatement: true,
    strengths: [
      { strength: '협업', quote: '함께 일하는 분', reason: '이유', prepQuestion: '질문' },
      { strength: '책임감', quote: 42 },
      'not-an-object',
      { strength: '소통', quote: '소통하는 분' },
    ],
    skills: { required: ['React', '', 3], preferred: 'Next.js' },
  }, '2026-11-24T07:00:00.000Z');
  assert.equal(info.summary, '웹 서비스 회사예요.');
  assert.deepEqual(info.strengths.map((item) => item.strength), ['협업', '소통']);
  assert.equal(info.strengths[1].reason, '');
  assert.deepEqual([info.requiredSkills, info.preferredSkills], [['React'], []]);
  assert.equal(parseCompanyInfo(null, '2026-11-24T07:00:00.000Z'), null);
  assert.equal(parseCompanyInfo({}, undefined), null);
});

test('서버 안내 문구는 그대로, 로그인 만료·연결 오류는 알기 쉬운 문구로 보여 준다', async () => {
  const httpError = (status, body) => new FunctionsHttpError(new Response(JSON.stringify(body), { status }));
  assert.equal(await companyInfoErrorMessage(httpError(429, { error: '회사 정보는 하루 5번까지 새로 만들 수 있어요. 내일 다시 해 주세요.', code: 'daily_limit' })),
    '회사 정보는 하루 5번까지 새로 만들 수 있어요. 내일 다시 해 주세요.');
  assert.match(await companyInfoErrorMessage(httpError(401, { code: 'UNAUTHORIZED_INVALID_JWT_FORMAT', message: 'Invalid JWT' })), /로그인이 만료/);
  assert.match(await companyInfoErrorMessage(new FunctionsHttpError(new Response('not json', { status: 500 }))), /만들지 못했어요/);
  assert.match(await companyInfoErrorMessage(new FunctionsFetchError(new Error('offline'))), /연결이 불안정/);
});

test('화면의 길이·한도 안내 숫자는 서버 규칙과 같다', () => {
  assert.deepEqual(
    [COMPANY_INFO_MIN_LENGTH, COMPANY_INFO_MAX_LENGTH, COMPANY_INFO_DAILY_LIMIT],
    [server.MIN_POSTING_LENGTH, server.MAX_POSTING_LENGTH, server.DAILY_LIMIT],
  );
});
