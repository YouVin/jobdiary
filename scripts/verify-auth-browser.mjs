// 실제 앱/SDK/Chromium을 실행하되 Google·Supabase HTTP는 fixture로 격리한다.
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const policy = { terms_version: '2026-10-17', privacy_version: '2026-10-17' };
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const failures = [];
let passed = 0;

async function scenario(name, run) {
  const context = await browser.newContext();
  const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'chosen-google@example.test', app_metadata: { provider: 'google' }, user_metadata: {}, created_at: '2026-10-01T00:00:00Z' };
  const calls = { google: [], email: [], consent: 0, applications: 0 };
  let emailRelease;
  let emailPending = false;
  const options = { delayEmail: false };
  const pageErrors = [];
  context.on('page', page => page.on('pageerror', error => pageErrors.push(error.message)));
  await context.route('https://*.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/auth/v1/authorize') {
      calls.google.push(url.toString());
      const callback = new URL(url.searchParams.get('redirect_to'));
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
      const jwt = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp })}.test`;
      const params = new URLSearchParams({ access_token: jwt, refresh_token: 'fake-refresh', expires_in: '3600', token_type: 'bearer' });
      const success = callback.toString() + '#' + params;
      const cancel = callback.toString() + '#error=access_denied&error_description=User+cancelled';
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: `<h1>Google 테스트 인증</h1><a href="${success.replaceAll('&', '&amp;')}">승인</a><a href="${cancel.replaceAll('&', '&amp;')}">취소</a>` });
    }
    if (url.pathname === '/auth/v1/user') {
      if (request.method() === 'PUT') {
        calls.consent++;
        Object.assign(user.user_metadata, request.postDataJSON().data);
      }
      return send(user);
    }
    if (url.pathname === '/auth/v1/signup' || url.pathname === '/auth/v1/token') {
      calls.email.push({ path: url.pathname, body: request.postDataJSON() });
      if (options.delayEmail) {
        emailPending = true;
        await new Promise(resolve => { emailRelease = resolve; });
      }
      if (url.pathname.endsWith('signup')) return send({ user: { ...user, email: request.postDataJSON().email }, session: null });
      return send({ code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
    }
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (url.pathname === '/rest/v1/applications') {
      calls.applications++;
      assert.equal(url.searchParams.get('user_id'), `eq.${user.id}`);
      return send([]);
    }
    throw new Error(`예상하지 않은 요청: ${request.method()} ${url.pathname}`);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const google = () => page.getByRole('button', { name: 'Google로 계속하기', exact: true });
  try {
    await page.goto(origin + '/login');
    await google().waitFor();
    await run({ page, context, user, calls, options, google, releaseEmail: () => emailRelease?.(), waitEmail: async () => { for (let i = 0; !emailPending && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 20)); assert(emailPending); } });
    assert.deepEqual(pageErrors, []);
    console.log(`PASS ${name}`);
    passed++;
  } finally {
    emailRelease?.();
    await context.close();
  }
}

try {
  await scenario('빈 필드는 포커스 이탈만으로 오류를 표시하지 않음', async ({ page, calls }) => {
    await page.getByLabel('이메일', { exact: true }).focus();
    await page.getByLabel('비밀번호', { exact: true }).focus();
    await page.getByRole('heading', { name: '다시 오셨네요', exact: true }).click();
    assert.equal(await page.locator('#email-error').count(), 0);
    assert.equal(await page.locator('#password-error').count(), 0);
    await page.getByRole('button', { name: '로그인', exact: true }).last().click();
    await page.getByText('이메일을 입력해주세요.', { exact: true }).waitFor();
    await page.getByText('비밀번호를 입력해주세요.', { exact: true }).waitFor();
    assert.equal(calls.email.length, 0);
  });
  await scenario('400ms 입력 정지 후 상세 안내, 수정 즉시 해제, 서버 요청 없음', async ({ page, calls }) => {
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    const email = page.getByLabel('이메일', { exact: true });
    await email.fill('name');
    await page.clock.runFor(399);
    assert.equal(await page.locator('#email-error').count(), 0);
    await page.clock.runFor(1);
    await page.getByText('이메일에 @를 포함해주세요. 예: name@example.com', { exact: true }).waitFor();
    await email.fill('name@');
    assert.equal(await page.locator('#email-error').count(), 0);
    await page.clock.runFor(400);
    await page.getByText('@ 뒤에 도메인을 입력해주세요. 예: gmail.com', { exact: true }).waitFor();
    await email.fill('name@example.com');
    assert.equal(await page.locator('#email-error').count(), 0);
    assert.equal(await email.getAttribute('aria-invalid'), 'false');
    assert.equal(calls.email.length, 0);
    assert.equal(calls.google.length, 0);
  });
  await scenario('입력 후 blur 즉시 검사, 모드 변경 시 지연 검사 초기화', async ({ page }) => {
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    const email = page.getByLabel('이메일', { exact: true });
    await email.fill('name@');
    await page.getByLabel('비밀번호', { exact: true }).focus();
    await page.getByText('@ 뒤에 도메인을 입력해주세요. 예: gmail.com', { exact: true }).waitFor();
    await email.fill('name');
    await page.getByRole('button', { name: '회원가입', exact: true }).first().click();
    await page.clock.runFor(500);
    assert.equal(await page.locator('#email-error').count(), 0);
  });
  await scenario('가입 탭에서도 Google 시작 전 중복 약관 체크 없음', async ({ page, google, calls }) => {
    await page.getByRole('button', { name: '회원가입', exact: true }).first().click();
    await google().click();
    await page.waitForURL('https://*.supabase.co/auth/v1/authorize**');
    assert.equal(calls.google.length, 1);
    assert.equal(calls.email.length, 0);
  });
  await scenario('Google 화면 뒤로가기 후 다시 Google 인증 시작', async ({ page, google, calls }) => {
    await google().click();
    await page.waitForURL('https://*.supabase.co/auth/v1/authorize**');
    await page.goBack();
    await google().waitFor();
    assert(await google().isEnabled());
    await google().click();
    await page.waitForURL('https://*.supabase.co/auth/v1/authorize**');
    assert.equal(calls.google.length, 2);
  });
  await scenario('이메일/비밀번호를 잘못 입력해도 Google은 별도 인증', async ({ page, google, calls }) => {
    await page.getByLabel('이메일', { exact: true }).fill('not-an-email');
    await page.getByLabel('비밀번호', { exact: true }).fill('x');
    await google().click();
    await page.waitForURL('https://*.supabase.co/auth/v1/authorize**');
    const url = new URL(calls.google[0]);
    assert.equal(url.searchParams.has('email'), false);
    assert.equal(url.searchParams.has('login_hint'), false);
    assert.equal(calls.email.length, 0);
  });
  await scenario('Google 취소 콜백 정리 후 재시도', async ({ page, google, calls }) => {
    await page.goto(origin + '/login?import=1');
    await google().click();
    await page.getByRole('link', { name: '취소', exact: true }).click();
    await page.getByText('구글 로그인에 실패했습니다. 다시 시도해주세요.', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).search, '?import=1');
    assert.equal(new URL(page.url()).hash, '');
    await google().click();
    await page.waitForURL('https://*.supabase.co/auth/v1/authorize**');
    const target = new URL(new URL(calls.google.at(-1)).searchParams.get('redirect_to'));
    assert.equal(target.search, '?import=1');
    assert.equal(target.hash, '');
  });
  await scenario('error_code만 있는 콜백도 안내하고 정리', async ({ page }) => {
    await page.goto(origin + '/login?import=1&error_code=access_denied');
    await page.getByText('구글 로그인에 실패했습니다. 다시 시도해주세요.', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).search, '?import=1');
  });
  await scenario('신규 Google 계정은 복귀 후 한 번 동의, 재로그인 생략', async ({ page, user, google, calls }) => {
    await google().click();
    await page.getByRole('link', { name: '승인', exact: true }).click();
    await page.getByRole('heading', { name: '서비스 이용 안내' }).waitFor();
    assert.equal(calls.applications, 0);
    await page.locator('#policy-consent').check();
    await page.getByRole('button', { name: '동의하고 시작하기', exact: true }).click();
    await page.getByRole('button', { name: '지원추가', exact: true }).waitFor();
    assert.equal(calls.consent, 1);
    assert.deepEqual({ terms_version: user.user_metadata.terms_version, privacy_version: user.user_metadata.privacy_version }, policy);
    await page.getByRole('button', { name: '로그아웃', exact: true }).click();
    await google().click();
    await page.getByRole('link', { name: '승인', exact: true }).click();
    await page.getByRole('button', { name: '지원추가', exact: true }).waitFor();
    assert.equal(calls.consent, 1);
    assert.equal(new URL(page.url()).hash, '');
  });
  await scenario('이메일 가입 인증 대기 후 Google 전환 가능', async ({ page, google, calls }) => {
    await page.getByRole('button', { name: '회원가입', exact: true }).first().click();
    await page.getByLabel('이메일', { exact: true }).fill('typed-email@example.test');
    await page.getByLabel('비밀번호', { exact: true }).fill('Password-123!');
    await page.getByLabel('비밀번호 확인', { exact: true }).fill('Password-123!');
    await page.locator('#terms').check();
    await page.getByRole('button', { name: '회원가입', exact: true }).last().click();
    await page.getByText('확인 메일을 발송했습니다.', { exact: false }).waitFor();
    await google().click();
    await page.getByRole('link', { name: '승인', exact: true }).click();
    await page.getByRole('heading', { name: '서비스 이용 안내' }).waitFor();
    assert.equal(calls.email.length, 1);
  });
  await scenario('이메일 요청 중 Google/모드 전환 차단, 실패 후 재시도', async ({ page, google, calls, options, waitEmail, releaseEmail }) => {
    options.delayEmail = true;
    await page.getByLabel('이메일', { exact: true }).fill('typed-email@example.test');
    await page.getByLabel('비밀번호', { exact: true }).fill('Password-123!');
    await page.getByRole('button', { name: '로그인', exact: true }).last().click();
    await waitEmail();
    assert(await google().isDisabled());
    assert(await page.getByRole('button', { name: '회원가입', exact: true }).first().isDisabled());
    releaseEmail();
    await page.getByText('이메일 또는 비밀번호가 올바르지 않습니다.', { exact: true }).waitFor();
    assert(await google().isEnabled());
    assert.equal(calls.email.length, 1);
  });
} catch (error) {
  failures.push(error);
  throw error;
} finally {
  await browser.close();
  console.log(`인증 브라우저 검증: ${passed}개 통과, ${failures.length}개 실패`);
}
