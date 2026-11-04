// 실제 Chromium + 프로덕션 웹앱. Supabase HTTP 경계는 테스트 데이터로 대체하며 운영 계정을 사용하지 않는다.
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const version = '2026-10-17';
const consent = { terms_version: version, privacy_version: version };
const users = {
  a: { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.test', user_metadata: { ...consent } },
  b: { id: '22222222-2222-4222-8222-222222222222', email: 'b@example.test', user_metadata: { ...consent } },
  google: { id: '33333333-3333-4333-8333-333333333333', email: 'google@example.test', user_metadata: {} },
};
for (const user of Object.values(users)) Object.assign(user, { aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, created_at: '2026-10-01T00:00:00Z' });
function session(user) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp })}.test`, refresh_token: `test-${user.id}`, token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
}
const row = (user, company, id) => ({ id, user_id: user.id, company, position: '개발자', platform: 'manual', status: 'applied', status_source: 'manual', applied_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', created_at: '2026-10-01T00:00:00Z', deadline_at: null, diary: [], memo: null });
const rows = [row(users.a, 'A 회사', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), row(users.b, 'B 회사', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')];
let signupCount = 0;
let inserts = 0;
let consentFail = true;
let delayed = null;
let delayNextA = false;
const errors = [];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext();
context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
await context.route('https://*.supabase.co/**', async route => {
  const req = route.request();
  const url = new URL(req.url());
  const method = req.method();
  const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  const token = req.headers().authorization?.split(' ')[1];
  let user;
  try { user = Object.values(users).find(item => item.id === JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).sub); } catch {}
  if (url.pathname === '/auth/v1/token') {
    const body = req.postDataJSON();
    const current = Object.values(users).find(item => item.email === body.email);
    assert(current, '테스트 계정만 로그인');
    return send(session(current));
  }
  if (url.pathname === '/auth/v1/signup') {
    signupCount++;
    assert.equal(req.postDataJSON().data.terms_version, version);
    return send({ user: users.a, session: null });
  }
  if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
  if (url.pathname === '/auth/v1/user') {
    assert(user, '인증 사용자 필요');
    if (method === 'PUT') {
      if (consentFail) return send({ msg: 'temporary failure' }, 500);
      Object.assign(user.user_metadata, req.postDataJSON().data);
    }
    return send(user);
  }
  if (url.pathname === '/rest/v1/applications') {
    assert(user, '지원 요청 인증 필요');
    if (method === 'POST') {
      inserts++;
      const values = req.postDataJSON();
      const value = Array.isArray(values) ? values[0] : values;
      assert.equal(value.user_id, user.id);
      const added = { ...row(user, value.company, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'), ...value };
      rows.push(added);
      return send(added, 201);
    }
    assert.equal(url.searchParams.get('user_id'), `eq.${user.id}`, '모든 조회/변경은 본인 필터');
    let found = rows.filter(item => item.user_id === user.id);
    const id = url.searchParams.get('id');
    if (id) found = found.filter(item => `eq.${item.id}` === id);
    if (method === 'GET') {
      const snapshot = structuredClone(found);
      if (delayNextA && user.id === users.a.id) {
        delayNextA = false;
        await new Promise(resolve => { delayed = resolve; });
      }
      return send(snapshot);
    }
    if (method === 'PATCH') {
      // 자동 마감 갱신: 이 fixture는 모두 manual이라 대상 없음.
      if (url.searchParams.has('status_source')) return send([]);
      const expected = url.searchParams.get('updated_at');
      if (expected) found = found.filter(item => `eq.${item.updated_at}` === expected);
      if (!found.length) return send({ code: 'PGRST116', message: '0 rows' }, 406);
      Object.assign(found[0], req.postDataJSON());
      return send(found[0]);
    }
  }
  throw new Error(`예상하지 않은 API: ${method} ${url.pathname}`);
});
const page = await context.newPage();
const visible = async locator => { await locator.waitFor({ state: 'visible' }); };
async function login(target, key) {
  await target.goto(`${origin}/login`);
  await target.getByLabel('이메일', { exact: true }).fill(users[key].email);
  await target.getByLabel('비밀번호', { exact: true }).fill('Test-password-123!');
  await target.getByRole('button', { name: '로그인', exact: true }).last().click();
}
try {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/terms', '/privacy']) {
      await page.goto(origin + path);
      await visible(page.getByRole('heading', { level: 1 }));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} ${width}px 가로 넘침`);
    }
  }
  console.log('PASS 공개 정책 페이지 및 3개 화면 너비');
  await page.goto(`${origin}/login`);
  await page.getByRole('button', { name: '회원가입', exact: true }).first().click();
  await page.getByLabel('이메일', { exact: true }).fill('new@example.test');
  await page.getByLabel('비밀번호', { exact: true }).fill('Test-password-123!');
  await page.getByLabel('비밀번호 확인', { exact: true }).fill('Test-password-123!');
  await page.getByRole('button', { name: '회원가입', exact: true }).last().click();
  assert.equal(signupCount, 0);
  await visible(page.getByText('약관에 동의해야 이메일로 회원가입할 수 있습니다.'));
  await page.locator('#terms').check();
  await page.getByRole('button', { name: '회원가입', exact: true }).last().click();
  await visible(page.getByText('확인 메일을 발송했습니다.', { exact: false }));
  assert.equal(signupCount, 1);
  console.log('PASS 이메일 미동의 차단 및 동의 버전 저장');
  await login(page, 'google');
  await visible(page.getByRole('heading', { name: '서비스 이용 안내' }));
  assert(await page.getByRole('button', { name: '동의하고 시작하기' }).isDisabled());
  await page.locator('#policy-consent').check();
  await page.getByRole('button', { name: '동의하고 시작하기' }).click();
  await visible(page.getByText('동의를 저장하지 못했습니다. 다시 시도해주세요.', { exact: true }));
  assert.equal(await page.getByRole('button', { name: '지원추가' }).count(), 0);
  consentFail = false;
  await page.getByRole('button', { name: '동의하고 시작하기' }).click();
  await visible(page.getByRole('button', { name: '지원추가' }));
  await page.reload();
  await visible(page.getByRole('button', { name: '지원추가' }));
  console.log('PASS 신규 소셜 계정 동의·저장 실패·재시도·새로고침 유지');
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await login(page, 'a');
  await visible(page.getByText('A 회사', { exact: true }));
  await page.getByRole('button', { name: '지원추가' }).click();
  await page.getByLabel('회사명 *', { exact: true }).fill('새 지원');
  await page.getByLabel('지원일 *', { exact: true }).fill('');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await visible(page.getByText('지원일을 올바르게 입력해주세요.', { exact: true }));
  assert.equal(inserts, 0);
  await page.getByLabel('지원일 *', { exact: true }).fill('2026-10-01');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await visible(page.getByText('새 지원', { exact: true }));
  assert.equal(inserts, 1);
  console.log('PASS 빈 지원일 API 차단·정상 재저장');
  await page.getByText('A 회사', { exact: true }).click();
  const second = await context.newPage();
  await second.goto(origin);
  await second.getByText('A 회사', { exact: true }).click();
  await second.getByLabel('상태', { exact: true }).selectOption('rejected');
  await second.getByRole('button', { name: '저장', exact: true }).click();
  await second.getByText('A 회사', { exact: true }).click();
  await second.getByLabel('상태', { exact: true }).selectOption('applied');
  await second.getByRole('button', { name: '저장', exact: true }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await visible(page.getByText('지원 내역이 다른 곳에서 변경되었거나 삭제됐습니다.', { exact: false }).last());
  assert.equal(rows[0].status, 'applied');
  assert.equal(rows[0].status_source, 'manual');
  console.log('PASS 두 탭 편집 충돌·수동 복원 보호');
  await second.getByRole('button', { name: '로그아웃', exact: true }).click();
  await visible(page.getByLabel('이메일', { exact: true }));
  assert.equal(await page.getByText('A 회사', { exact: true }).count(), 0);
  await login(second, 'b');
  await visible(page.getByText('B 회사', { exact: true }));
  assert.equal(await page.getByText('A 회사', { exact: true }).count(), 0);
  assert.equal(await page.getByLabel('회사명 *', { exact: true }).count(), 0);
  console.log('PASS 다른 탭 로그아웃·B 로그인 시 A 목록/편집창 제거');
  await second.getByRole('button', { name: '로그아웃', exact: true }).click();
  delayNextA = true;
  await login(page, 'a');
  await page.waitForFunction(() => location.pathname === '/');
  for (let attempt = 0; !delayed && attempt < 100; attempt++) await new Promise(resolve => setTimeout(resolve, 50));
  assert(delayed, 'A 조회 지연 요청 시작');
  await visible(second.getByRole('button', { name: '로그아웃', exact: true }));
  await second.getByRole('button', { name: '로그아웃', exact: true }).click();
  await login(second, 'b');
  delayed();
  await visible(page.getByText('B 회사', { exact: true }));
  assert.equal(await page.getByText('A 회사', { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS 이전 계정 지연 조회 무시·브라우저 예외 0건');
} finally {
  delayed?.();
  await browser.close();
}
