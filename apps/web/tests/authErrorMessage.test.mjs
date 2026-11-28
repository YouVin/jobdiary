import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

// 로그인·가입 오류 문구 (#264에서 LoginForm에서 분리한 순수 함수).
const { getFriendlyErrorMessage, GOOGLE_FAILED_MESSAGE } = createSourceLoader()('@/utils/authErrorMessage');

test('Supabase 영어 오류를 해요체 문구로 바꾸고, 인증 메일 미확인만 따로 구분한다', () => {
  const cases = [
    ['Invalid login credentials', '이메일이나 비밀번호가 맞지 않아요.', 'other'],
    ['User already registered', '이미 가입한 이메일이에요. 로그인해 주세요.', 'other'],
    ['Password should be at least 8 characters', /자 이상 입력해 주세요/, 'other'],
    ['Unable to validate email address: invalid format', '이메일 형식을 확인해 주세요.', 'other'],
    ['Email not confirmed', /이메일 인증이 아직/, 'email-not-confirmed'],
    ['For security purposes, you can only request this after 30 seconds', /요청이 너무 잦아요/, 'other'],
    // 메일을 보낼 수 없을 때(기본 메일 한도·팀원 아닌 주소)는 Google 로그인을 알린다
    ['email rate limit exceeded', /Google로 계속하기/, 'other'],
    ['Email address "a@b.com" cannot be used as it is not authorized', /Google로 계속하기/, 'other'],
    ['Failed to fetch', /인터넷 연결/, 'other'],
    ['TypeError: NetworkError when attempting to fetch resource.', /인터넷 연결/, 'other'],
    ['something unexpected', /요청을 처리하지 못했어요/, 'other'],
    ['', /요청을 처리하지 못했어요/, 'other'],
  ];
  for (const [raw, message, kind] of cases) {
    const result = getFriendlyErrorMessage(raw);
    if (message instanceof RegExp) assert.match(result.message, message, raw);
    else assert.equal(result.message, message, raw);
    assert.equal(result.kind, kind, raw);
  }
  assert.match(GOOGLE_FAILED_MESSAGE, /구글 로그인에 실패/);
});
