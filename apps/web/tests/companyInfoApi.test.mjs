import assert from 'node:assert/strict';
import test from 'node:test';
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { createSourceLoader } from './loadSource.mjs';

// 회사 정보 화면용 데이터 변환·오류 문구 (#229). Supabase 호출 부분은 브라우저 검증(verify-company-info-browser)이 맡는다.
const load = createSourceLoader();
const { parseCompanyInfo, companyInfoErrorMessage, websiteHref, naverMapHref, COMPANY_INFO_MIN_LENGTH, COMPANY_INFO_MAX_LENGTH, COMPANY_INFO_DAILY_LIMIT } = load('@/lib/companyInfoApi');
const server = load('../../supabase/functions/_shared/companyInfo/handler.ts');

test('서버 결과(JSON)를 화면 형식으로 옮기고, 모양이 틀린 강점은 버린다 (#235 형식)', () => {
  const info = parseCompanyInfo({
    transcript: '이미지에서 읽은 글',
    company: { about: '시선추적 SDK를 만드는 회사예요.', products: ['SeeSo', 'READ', 3, '하나', '둘'], website: 'www.visual.camp' },
    hasTalentStatement: true, // #260 전 저장된 결과에는 남아 있다(읽을 때 무시)
    strengths: [
      { strength: '협동성', quote: '함께 일하는 분', wants: '여러 직군과 맞춰 가는 사람', experiences: ['팀 프로젝트에서 역할을 나눈 경험', ''] },
      { strength: '책임감', quote: 42 },
      'not-an-object',
      { strength: '소통 능력', quote: '소통하는 분' },
    ],
    workplace: { location: '서울 서초구 동산로 13', workDays: '주 5일', workHours: '' },
  }, '2026-11-24T07:00:00.000Z');
  assert.equal(info.about, '시선추적 SDK를 만드는 회사예요.');
  assert.deepEqual(info.products, ['SeeSo', 'READ', '하나'], '글자만, 최대 3개');
  assert.deepEqual(info.strengths.map((item) => item.strength), ['협동성', '소통 능력']);
  assert.deepEqual(info.strengths[0].experiences, ['팀 프로젝트에서 역할을 나눈 경험']);
  assert.deepEqual([info.strengths[1].wants, info.strengths[1].experiences], ['', []]);
  assert.deepEqual([info.location, info.workDays, info.workHours, info.fromImage], ['서울 서초구 동산로 13', '주 5일', '', true]);
  assert.equal(parseCompanyInfo(null, '2026-11-24T07:00:00.000Z'), null);
  assert.equal(parseCompanyInfo({}, undefined), null);
});

test('예전 형식(#229·#232) 결과도 회사 소개·원하는 것으로 옮겨 읽는다', () => {
  const info = parseCompanyInfo({
    companySummary: '웹 서비스 회사예요.',
    strengths: [{ strength: '협업', quote: '함께 일하는 분', reason: '여러 직군과 일해요', prepQuestion: '질문' }],
    skills: { required: ['React'], preferred: [] },
  }, '2026-11-24T07:00:00.000Z');
  assert.deepEqual([info.about, info.strengths[0].wants, info.fromImage, info.location], ['웹 서비스 회사예요.', '여러 직군과 일해요', false, '']);
});

test('대표 사이트·네이버 지도 링크는 안전한 주소만 만든다', () => {
  assert.equal(websiteHref('www.visual.camp'), 'https://www.visual.camp/');
  assert.equal(websiteHref('http://example.com/a'), 'http://example.com/a');
  assert.equal(websiteHref('javascript:alert(1)'), null, 'javascript: 주소는 링크로 만들지 않는다');
  assert.equal(websiteHref(''), null);
  assert.equal(naverMapHref('서울 서초구 동산로 13'), `https://map.naver.com/p/search/${encodeURIComponent('서울 서초구 동산로 13')}`);
  assert.equal(naverMapHref('  '), null);
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
