// 계정 기능의 성공 흐름을 운영 빌드에서 검사한다: 비밀번호 변경·이메일 변경·회원 탈퇴·비밀번호 찾기·재설정.
// Supabase 요청은 가짜 응답으로 가로채고, 화면이 서버에 무엇을 보내는지(새 비밀번호·새 이메일·돌아올 주소)까지 확인한다.
// 실제 메일 발송·메일 속 링크는 검사하지 않는다(운영 메일 설정은 Supabase 대시보드에서 확인).
// 사용: apps/web에서 `npx next start -p 3100` 뒤 `node scripts/verify-account-browser.mjs`
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { routeSupabase, scan, signIn, user } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.test`;
const session = { access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'test', user };
const CURRENT_PASSWORD = 'current-pass-1';

const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'msedge' }), headless: true });
const errors = [];

// 기본 가짜 서버 위에 계정 요청을 덧붙이고, 보낸 내용을 모은다(supabase-js가 붙이는 code_challenge 같은 칸은 보지 않는다)
async function newPage({ account = user } = {}) {
  const context = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: 'reduce' });
  await routeSupabase(context);
  const sent = { passwordLogins: [], userUpdates: [], recover: [], deleted: 0 };
  await context.route('https://*.supabase.co/auth/v1/user*', async (route) => {
    const request = route.request();
    if (request.method() === 'PUT') sent.userUpdates.push(request.postDataJSON());
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(account) });
  });
  await context.route('https://*.supabase.co/auth/v1/token?grant_type=password', async (route) => {
    const body = route.request().postDataJSON();
    sent.passwordLogins.push(body.password);
    if (body.password !== CURRENT_PASSWORD) {
      return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...session, user: account }) });
  });
  await context.route('https://*.supabase.co/auth/v1/recover*', async (route) => {
    sent.recover.push({ url: route.request().url(), body: route.request().postDataJSON() });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await context.route('https://*.supabase.co/functions/v1/delete-account', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
    sent.deleted += 1;
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true }) });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  return { context, page, sent };
}

try {
  // ── 1) 비밀번호 변경: 지금 비밀번호가 틀리면 안내, 맞으면 바꾸고 알림 ──
  {
    const { context, page, sent } = await newPage();
    await signIn(page, origin, '/account');
    const form = page.locator('[aria-labelledby="change-password-title"]');
    await form.getByLabel('지금 비밀번호', { exact: true }).fill('wrong-pass');
    await form.getByLabel('새 비밀번호', { exact: true }).fill('new-pass-123');
    await form.getByLabel('새 비밀번호 확인', { exact: true }).fill('new-pass-123');
    await form.getByRole('button', { name: '비밀번호 바꾸기' }).click();
    await form.getByText('지금 비밀번호가 맞지 않아요.').waitFor();
    assert.equal(sent.userUpdates.length, 0, '틀리면 바꾸지 않는다');
    await form.getByLabel('지금 비밀번호', { exact: true }).fill(CURRENT_PASSWORD);
    await form.getByRole('button', { name: '비밀번호 바꾸기' }).click();
    await page.getByText('비밀번호를 바꿨어요').waitFor();
    assert.deepEqual(sent.passwordLogins, ['wrong-pass', CURRENT_PASSWORD], '지금 비밀번호로 다시 확인한 뒤');
    assert.deepEqual(sent.userUpdates.map((body) => body.password), ['new-pass-123']);
    console.log('PASS 비밀번호 변경: 지금 비밀번호 틀림 안내·바꾸지 않음, 맞으면 다시 확인 → 새 비밀번호 저장·알림');

    // ── 2) 이메일 변경: 새 이메일로 요청하고 확인 메일 안내 ──
    const emailForm = page.locator('[aria-labelledby="change-email-title"]');
    // 지금 이메일과 같으면 요청하지 않고 안내
    const updatesBefore = sent.userUpdates.length;
    await emailForm.getByLabel('새 이메일').fill(user.email);
    await emailForm.getByRole('button', { name: '확인 메일 보내기' }).click();
    await emailForm.getByText('지금 쓰는 이메일과 같아요.').waitFor();
    assert.equal(sent.userUpdates.length, updatesBefore);
    await emailForm.getByLabel('새 이메일').fill('new@example.test');
    await emailForm.getByRole('button', { name: '확인 메일 보내기' }).click();
    await emailForm.getByText(/확인 메일을 보냈어요/).waitFor();
    assert.equal(sent.userUpdates.at(-1).email, 'new@example.test');
    console.log('PASS 이메일 변경: 같은 이메일은 요청 없이 안내, 새 이메일 요청·확인 메일 안내');

    // ── 3) 회원 탈퇴: 확인 문구 → 탈퇴 → 로그아웃 → 로그인 화면 안내 ──
    const deleteForm = page.locator('[aria-labelledby="delete-account-title"]');
    await deleteForm.getByRole('textbox').fill('탈퇴합니다');
    await scan(page, '계정 설정');
    await deleteForm.getByRole('button', { name: '회원 탈퇴' }).click();
    await page.waitForURL(`${origin}/login?accountDeleted=1`);
    await page.getByText('탈퇴가 끝났어요.', { exact: false }).waitFor();
    assert.equal(sent.deleted, 1);
    console.log('PASS 회원 탈퇴: 확인 문구 → 탈퇴 요청 1번 → 로그인 화면 안내');
    await context.close();
  }

  // ── 4) Google로만 가입한 계정: 비밀번호가 없다는 안내 ──
  {
    const googleUser = { ...user, app_metadata: { provider: 'google' }, identities: [{ id: 'google-identity', provider: 'google', user_id: user.id, identity_data: {}, created_at: '2026-09-01T00:00:00Z' }] };
    const { context, page } = await newPage({ account: googleUser });
    await page.route('https://*.supabase.co/auth/v1/user*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(googleUser) }));
    await signIn(page, origin, '/account');
    await page.getByText('Google로 가입한 계정은 비밀번호가 없어요.', { exact: false }).waitFor();
    assert.equal(await page.getByLabel('지금 비밀번호', { exact: true }).count(), 0);
    await page.getByText('Google로 가입한 계정은 Google 계정의 이메일로 로그인해요.', { exact: false }).waitFor();
    assert.equal(await page.getByLabel('새 이메일').count(), 0);
    console.log('PASS Google 계정: 비밀번호·이메일 변경 대신 안내');
    await context.close();
  }

  // ── 5) 비밀번호 찾기: 재설정 링크 요청, 돌아올 주소는 /update-password ──
  {
    const { context, page, sent } = await newPage();
    await page.goto(`${origin}/reset-password`);
    await page.getByLabel('이메일', { exact: true }).fill('sample@example.test');
    await page.getByRole('button', { name: /링크/ }).click();
    await page.getByText('재설정 링크를 보냈어요').waitFor();
    assert.equal(sent.recover.length, 1);
    assert.equal(sent.recover[0].body.email, 'sample@example.test');
    assert.equal(new URL(sent.recover[0].url).searchParams.get('redirect_to'), `${origin}/update-password`);
    await scan(page, '비밀번호 찾기 보냄');
    console.log('PASS 비밀번호 찾기: 재설정 링크 요청·돌아올 주소 /update-password·보냄 안내');
    await context.close();
  }

  // ── 6) 재설정: 메일 링크로 오면 새 비밀번호 → 로그아웃 → 로그인 안내, 링크 없이 오면 만료 안내 ──
  {
    const { context, page, sent } = await newPage();
    await page.goto(`${origin}/update-password`);
    await page.getByText('링크가 만료됐거나 올바르지 않아요').waitFor();
    // 같은 주소에서 # 뒤만 바꾸면 새로 열리지 않아 메일 링크로 온 것으로 읽지 않는다. 빈 페이지를 거친다
    await page.goto('about:blank');
    await page.goto(`${origin}/update-password#access_token=${token}&refresh_token=test&expires_in=3600&token_type=bearer&type=recovery`);
    await page.getByLabel('새 비밀번호', { exact: true }).fill('reset-pass-456');
    await page.getByLabel('새 비밀번호 확인', { exact: true }).fill('reset-pass-456');
    await page.getByRole('button', { name: /비밀번호/ }).last().click();
    await page.waitForURL(`${origin}/login?passwordUpdated=1`);
    await page.getByText('비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요.').waitFor();
    assert.deepEqual(sent.userUpdates.map((body) => body.password), ['reset-pass-456']);
    console.log('PASS 비밀번호 재설정: 링크 없으면 만료 안내, 메일 링크로 새 비밀번호 저장 → 로그인 안내');
    await context.close();
  }

  assert.deepEqual(errors, []);
  console.log('PASS 계정 기능 6가지, 브라우저 예외 0건');
} finally {
  await browser.close();
}
