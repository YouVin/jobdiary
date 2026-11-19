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
let failNextPatch = false;
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
      if (failNextPatch) {
        failNextPatch = false;
        return send({ message: 'temporary failure' }, 500);
      }
      const expected = url.searchParams.get('updated_at');
      if (expected) found = found.filter(item => `eq.${item.updated_at}` === expected);
      if (!found.length) return send({ code: 'PGRST116', message: '0 rows' }, 406);
      Object.assign(found[0], req.postDataJSON());
      return send(found[0]);
    }
  }
  throw new Error(`예상하지 않은 API: ${method} ${url.pathname}`);
});
// 화면 전환 애니메이션(#176)이 실제로 시작됐는지 센다. 지원하지 않는 브라우저 흉내는 아래 마지막 단계에서 한다.
await context.addInitScript(() => {
  const original = Document.prototype.startViewTransition;
  if (!original) return;
  Document.prototype.startViewTransition = function (...args) {
    window.__viewTransitionCount = (window.__viewTransitionCount ?? 0) + 1;
    return original.apply(this, args);
  };
});
const page = await context.newPage();
const visible = async locator => { await locator.waitFor({ state: 'visible' }); };
// 헤더 탭으로 지원 보드에 들어간다. 클라이언트 이동이라 스토어에 있는 목록을 그대로 보여준다.
async function openBoard(target) {
  await target.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: /지원 보드/ }).click();
  await target.waitForFunction(() => location.pathname === '/board');
}
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
  // 로그인 후 홈(통계 대시보드)으로 돌아온다. 카드 편집은 지원 보드에서 확인한다.
  await page.waitForFunction(() => location.pathname === '/');
  await visible(page.getByRole('region', { name: '오늘의 지원 요약' }));
  await page.goto(`${origin}/board`);
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
  // 지원을 누르면 상세 패널(#175)이 열리고, "정보 수정"으로 기존 수정 폼을 쓴다.
  const openEdit = async target => { await target.getByRole('dialog').getByRole('button', { name: '정보 수정' }).click(); };
  await page.getByText('A 회사', { exact: true }).click();
  await openEdit(page);
  const second = await context.newPage();
  await second.goto(`${origin}/board`);
  // 탈락으로 바꾼 지원은 주간 목록에서 빠지므로, 모든 단계가 보이는 보드(칸반) 보기에서 편집한다.
  await second.getByRole('group', { name: '보기 선택' }).getByRole('button', { name: '보드', exact: true }).click();
  await second.getByText('A 회사', { exact: true }).click();
  await openEdit(second);
  await second.getByLabel('상태', { exact: true }).selectOption('rejected');
  await second.getByRole('button', { name: '저장', exact: true }).click();
  // 저장하면 패널의 상세 화면으로 돌아온다. 닫고 탈락 열의 카드를 다시 연다.
  await visible(second.getByRole('dialog').getByRole('button', { name: '정보 수정' }));
  await second.keyboard.press('Escape');
  await second.getByText('A 회사', { exact: true }).click();
  await openEdit(second);
  await second.getByLabel('상태', { exact: true }).selectOption('applied');
  await second.getByRole('button', { name: '저장', exact: true }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await visible(page.getByText('지원 내역이 다른 곳에서 변경되었거나 삭제됐습니다.', { exact: false }).last());
  assert.equal(rows[0].status, 'applied');
  assert.equal(rows[0].status_source, 'manual');
  console.log('PASS 두 탭 편집 충돌·수동 복원 보호');
  // 저장 후에도 패널은 상세 화면으로 남아 있으므로 닫고 로그아웃한다(A 탭의 패널은 열어 둔다).
  await second.keyboard.press('Escape');
  await second.getByRole('button', { name: '로그아웃', exact: true }).click();
  await visible(page.getByLabel('이메일', { exact: true }));
  assert.equal(await page.getByText('A 회사', { exact: true }).count(), 0);
  await login(second, 'b');
  await page.waitForFunction(() => location.pathname === '/');
  await visible(page.getByRole('region', { name: '오늘의 지원 요약' }));
  await openBoard(page);
  await visible(page.getByText('B 회사', { exact: true }));
  assert.equal(await page.getByText('A 회사', { exact: true }).count(), 0);
  assert.equal(await page.getByLabel('회사명 *', { exact: true }).count(), 0);
  assert.equal(await page.getByRole('dialog').count(), 0);
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
  await visible(page.getByRole('region', { name: '오늘의 지원 요약' }));
  await openBoard(page);
  await visible(page.getByText('B 회사', { exact: true }));
  assert.equal(await page.getByText('A 회사', { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS 이전 계정 지연 조회 무시·브라우저 예외 0건');
  // 지원 보드 주간 보기(#174): 트랙 점으로 단계 변경 → 저장·새로고침 유지, 저장 실패 시 되돌림, 고른 보기 기억
  // 앞 단계에서 보드 보기를 골랐으므로(이 브라우저에 기억됨) 주간 보기로 돌아온다.
  const viewGroup = page.getByRole('group', { name: '보기 선택' });
  await viewGroup.getByRole('button', { name: '주간', exact: true }).click();
  const bTrack = page.getByRole('group', { name: 'B 회사 단계' });
  await bTrack.getByRole('button', { name: '서류통과로 옮기기' }).click();
  await visible(bTrack.getByRole('button', { name: '서류통과 (현재 단계)' }));
  for (let attempt = 0; rows[1].status !== 'screening' && attempt < 100; attempt++) await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(rows[1].status, 'screening');
  await page.reload();
  await visible(bTrack.getByRole('button', { name: '서류통과 (현재 단계)' }));
  failNextPatch = true;
  await bTrack.getByRole('button', { name: '면접예정으로 옮기기' }).click();
  await visible(page.getByRole('alert').filter({ hasText: 'B 회사의 단계를 바꾸지 못해' }));
  await visible(bTrack.getByRole('button', { name: '서류통과 (현재 단계)' }));
  assert.equal(rows[1].status, 'screening');
  await viewGroup.getByRole('button', { name: '보드', exact: true }).click();
  await page.reload();
  await visible(page.getByPlaceholder('회사명 또는 공고명 입력'));
  assert.equal(await bTrack.count(), 0);
  await viewGroup.getByRole('button', { name: '주간', exact: true }).click();
  await visible(bTrack);
  assert.deepEqual(errors, []);
  console.log('PASS 주간 목록 단계 변경·저장 실패 되돌림·보기 기억');
  // 상세 패널·기록 남기기(#175): 키보드로 열고 닫기, 기록 저장·새로고침 유지, 다른 탭 변경 충돌 시 글 보존, 바깥 클릭 닫기
  const bOpen = page.getByRole('button', { name: 'B 회사 개발자', exact: true });
  const panel = page.getByRole('dialog', { name: 'B 회사' });
  await bOpen.focus();
  await page.keyboard.press('Enter');
  await visible(panel);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('role')), 'dialog');
  await panel.getByRole('textbox').fill('포트폴리오 정리하기');
  await panel.getByRole('button', { name: '기록 남기기' }).click();
  await visible(panel.getByText('기록을 남겼어요.'));
  assert.equal(rows[1].diary.length, 1);
  assert.deepEqual([rows[1].diary[0].content, rows[1].diary[0].status], ['포트폴리오 정리하기', 'screening']);
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.includes('B 회사')), true);
  await page.reload();
  await page.getByRole('button', { name: 'B 회사 개발자', exact: true }).click();
  await visible(panel.getByText('포트폴리오 정리하기'));
  await panel.getByRole('button', { name: '정보 수정' }).click();
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.id ?? ''), await page.getByLabel('회사명 *', { exact: true }).evaluate(element => element.getAttribute('aria-label') ?? element.id));
  await panel.getByRole('button', { name: '취소', exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), '정보 수정');
  rows[1].updated_at = '2026-11-02T00:00:00Z'; // 다른 탭에서 먼저 바뀐 것으로 만든다
  await panel.getByRole('textbox').fill('충돌 확인');
  await panel.getByRole('button', { name: '기록 남기기' }).click();
  await visible(panel.getByRole('alert').filter({ hasText: '다른 곳에서 변경' }));
  assert.equal(await panel.getByRole('textbox').inputValue(), '충돌 확인');
  assert.equal(rows[1].diary.length, 1);
  await page.mouse.click(10, 400);
  await panel.waitFor({ state: 'detached' });
  assert.deepEqual(errors, []);
  console.log('PASS 상세 패널 키보드 열고 닫기·기록 저장·새로고침 유지·충돌 시 글 보존');
  // 화면 전환 애니메이션(#176): 지원 브라우저에서는 주 이동 때 전환이 시작되고,
  // View Transitions API가 없는 브라우저에서도 주 이동·단계 필터·단계 변경·보기 전환이 같게 동작한다.
  await page.getByRole('button', { name: '다음 주', exact: true }).click();
  await visible(page.getByRole('heading', { name: '다음 주', exact: true }));
  assert((await page.evaluate(() => window.__viewTransitionCount ?? 0)) > 0, '주 이동 시 화면 전환 시작');
  await page.getByRole('button', { name: '이번 주', exact: true }).click();
  const plain = await context.newPage();
  await plain.addInitScript(() => { delete Document.prototype.startViewTransition; });
  await plain.goto(`${origin}/board`);
  assert.equal(await plain.evaluate(() => 'startViewTransition' in document), false);
  const plainTrack = plain.getByRole('group', { name: 'B 회사 단계' });
  await visible(plainTrack);
  await plain.getByRole('button', { name: '다음 주', exact: true }).click();
  await visible(plain.getByRole('heading', { name: '다음 주', exact: true }));
  await plain.getByRole('button', { name: '이번 주', exact: true }).click();
  await visible(plain.getByRole('heading', { name: '이번 주', exact: true }));
  const screeningPill = plain.getByRole('group', { name: '단계별 보기' }).getByRole('button', { name: /서류통과/ });
  await screeningPill.click();
  await visible(plain.getByRole('group', { name: '단계별 보기' }).getByRole('button', { name: /서류통과/, pressed: true }));
  await visible(plainTrack);
  await screeningPill.click();
  await visible(plain.getByRole('group', { name: '단계별 보기' }).getByRole('button', { name: /서류통과/, pressed: false }));
  await plainTrack.getByRole('button', { name: '면접예정으로 옮기기' }).click();
  await visible(plainTrack.getByRole('button', { name: '면접예정 (현재 단계)' }));
  for (let attempt = 0; rows[1].status !== 'interview' && attempt < 100; attempt++) await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(rows[1].status, 'interview');
  await plainTrack.getByRole('button', { name: '서류통과로 옮기기' }).click();
  await visible(plainTrack.getByRole('button', { name: '서류통과 (현재 단계)' }));
  const plainView = plain.getByRole('group', { name: '보기 선택' });
  await plainView.getByRole('button', { name: '보드', exact: true }).click();
  await visible(plain.getByPlaceholder('회사명 또는 공고명 입력'));
  await plainView.getByRole('button', { name: '주간', exact: true }).click();
  await visible(plainTrack);
  assert.equal(await plain.evaluate(() => window.__viewTransitionCount ?? 0), 0);
  assert.deepEqual(errors, []);
  console.log('PASS 화면 전환 애니메이션 시작·View Transitions 미지원 브라우저 동일 동작');
} finally {
  delayed?.();
  await browser.close();
}
