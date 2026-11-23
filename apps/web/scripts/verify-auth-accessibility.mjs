// 실제 Chromium/앱에서 키보드·스타일·axe를 검사한다. 인증 HTTP는 fixture다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const axeSource = fs.readFileSync('node_modules/.release-tools/node_modules/axe-core/axe.min.js', 'utf8');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext();
let releaseLogin;
let resendCount = 0;
const pageErrors = [];
await context.route('https://*.supabase.co/**', async route => {
  const url = new URL(route.request().url());
  if (url.pathname === '/auth/v1/token') {
    await new Promise(resolve => { releaseLogin = resolve; });
    return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'email_not_confirmed', msg: 'Email not confirmed' }) });
  }
  if (url.pathname === '/auth/v1/resend') {
    resendCount++;
    return route.fulfill({ status: resendCount === 1 ? 500 : 200, contentType: 'application/json', body: JSON.stringify(resendCount === 1 ? { msg: 'retry later' } : {}) });
  }
  throw new Error(`예상하지 않은 HTTP: ${url.pathname}`);
});
const page = await context.newPage();
page.on('pageerror', error => pageErrors.push(error.message));
page.setDefaultTimeout(10000);

async function scan(name) {
  const result = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    });
    return result.violations.map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) }));
  });
  assert.deepEqual(result, [], name);
  const missing = await page.evaluate(() => Array.from(document.querySelectorAll('[aria-describedby], [aria-controls], [aria-labelledby]')).flatMap(element => ['aria-describedby', 'aria-controls', 'aria-labelledby'].flatMap(attribute => (element.getAttribute(attribute) || '').split(' ').filter(Boolean).filter(id => !document.getElementById(id)))));
  assert.deepEqual(missing, [], 'ARIA 참조 대상 존재');
  console.log(`PASS axe/ARIA ${name}`);
}

try {
  await page.goto(origin + '/login');
  await page.getByRole('button', { name: 'Google로 계속하기', exact: true }).waitFor();
  await page.addScriptTag({ content: axeSource });
  const cdp = await context.newCDPSession(page);
  async function accessibleField(name, description) {
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const field = nodes.find(node => node.role?.value === 'textbox' && node.name?.value === name);
    assert(field, `${name}이 접근성 트리에 이름으로 노출`);
    assert.match(field.description?.value || '', description);
    assert(field.properties.some(property => property.name === 'required' && property.value.value === true));
  }
  await accessibleField('이메일', /^$/);
  await page.evaluate(() => {
    window.errorFocusEvents = [];
    document.addEventListener('focusin', event => {
      if (!['email', 'password', 'confirmPassword', 'terms'].includes(event.target.id)) return;
      const field = event.target;
      window.errorFocusEvents.push({ id: field.id, invalid: field.getAttribute('aria-invalid'), description: (field.getAttribute('aria-describedby') || '').split(' ').map(id => document.getElementById(id)?.textContent.trim() || '').join(' ') });
    });
  });
  await scan('로그인');
  assert.equal(await page.getByRole('main').count(), 1);
  assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
  // 소개(맥북·아이폰)는 장식이라 접근성 트리에서 빠지고, 폼(main)이 소개(aside)보다 먼저 읽힌다 (#202).
  assert.equal(await page.getByRole('complementary', { name: '서비스 미리보기' }).count(), 1);
  assert(await page.evaluate(() => document.querySelector('main').compareDocumentPosition(document.querySelector('aside')) & Node.DOCUMENT_POSITION_FOLLOWING));
  assert.equal(await page.getByRole('complementary').getByRole('img').count(), 0);

  // 제목 다음 Tab은 이메일 칸이고, 칸 테두리가 포커스 색(#3461D1)으로 바뀐다.
  await page.getByRole('heading', { name: '다시 오셨네요', exact: true }).click();
  await page.keyboard.press('Tab');
  await page.waitForTimeout(250); // 테두리 색 전환(duration-fast)이 끝난 뒤 잰다
  const focused = await page.evaluate(() => ({ id: document.activeElement.id, border: getComputedStyle(document.activeElement).borderColor }));
  assert.deepEqual(focused, { id: 'email', border: 'rgb(52, 97, 209)' });

  // 이름표 옆 "비밀번호 찾기"와 칸 안 보기 버튼은 비밀번호 칸 앞뒤로 Tab이 닿는다.
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), '비밀번호 찾기');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'password');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), '비밀번호 보기');
  const focusRing = await page.evaluate(() => ({ outline: getComputedStyle(document.activeElement).outlineWidth, visible: document.activeElement.matches(':focus-visible') }));
  assert.deepEqual(focusRing, { outline: '3px', visible: true });

  // 가입하기는 링크라 키보드 Enter로 /signup에 간다. ?가 없으면 쿼리도 붙지 않는다.
  const signupLink = page.getByRole('link', { name: '가입하기', exact: true });
  assert.equal(await signupLink.getAttribute('href'), '/signup');
  await signupLink.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/signup');
  const signupForm = page.getByRole('form', { name: '이메일 회원가입', exact: true });
  await signupForm.waitFor();
  assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), '환영해요');
  const errorRegion = await page.locator('#email-error').elementHandle();
  await scan('가입·빈 필드');
  const submit = signupForm.getByRole('button', { name: '가입하기', exact: true });
  await page.mouse.move(0, 0);
  const normal = await submit.evaluate(element => getComputedStyle(element).backgroundColor);
  await submit.hover();
  await page.waitForTimeout(200);
  assert.notEqual(await submit.evaluate(element => getComputedStyle(element).backgroundColor), normal);
  assert.equal(await submit.evaluate(element => getComputedStyle(element).cursor), 'pointer');
  await submit.click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'email');
  const emailFocus = await page.evaluate(() => window.errorFocusEvents.at(-1));
  assert.equal(emailFocus.invalid, 'true');
  assert.match(emailFocus.description, /이메일을 입력해 주세요/);
  assert(await errorRegion.evaluate(element => element === document.getElementById('email-error')), '오류 live region은 기존 노드의 내용을 갱신');
  await accessibleField('이메일', /이메일을 입력해 주세요/);
  assert.equal(await page.locator('#terms').getAttribute('aria-describedby'), 'terms-error');
  await scan('가입·필수 오류');
  await page.getByLabel('이메일', { exact: true }).fill('test@example.test');
  await submit.click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'password');
  assert.match(await page.evaluate(() => window.errorFocusEvents.at(-1).description), /비밀번호를 입력해 주세요/);
  await page.getByLabel('비밀번호', { exact: true }).fill('123456');
  await page.getByText('비밀번호 강도: 약함', { exact: true }).waitFor();
  const toggle = page.locator('button[aria-controls="password"]');
  await toggle.focus();
  await page.keyboard.press('Space');
  // 버튼 이름은 그대로 두고 눌림 상태만 바뀐다.
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(await toggle.getAttribute('aria-label'), '비밀번호 보기');
  assert.equal(await page.locator('#password').getAttribute('type'), 'text');
  await scan('가입·비밀번호 강도/표시');
  await submit.click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'confirmPassword');
  assert.match(await page.evaluate(() => window.errorFocusEvents.at(-1).description), /비밀번호/);
  await page.getByLabel('비밀번호 확인', { exact: true }).fill('123456');
  await submit.click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'terms');
  assert.match(await page.evaluate(() => window.errorFocusEvents.at(-1).description), /약관에 동의/);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px 가로 넘침`);
  }

  // 로그인하기 링크로 돌아오면 새 화면이라 입력이 비어 있다.
  await page.getByRole('link', { name: '로그인하기', exact: true }).click();
  await page.waitForURL('**/login');
  const form = page.getByRole('form', { name: '이메일 로그인', exact: true });
  await form.waitFor();
  assert.equal(await page.getByLabel('이메일', { exact: true }).inputValue(), '');
  const authAlert = await page.getByRole('main').getByRole('alert').elementHandle();
  await page.getByLabel('이메일', { exact: true }).fill('test@example.test');
  await page.getByLabel('비밀번호', { exact: true }).fill('123456');
  await form.getByRole('button', { name: '로그인', exact: true }).click();
  for (let i = 0; !releaseLogin && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 20));
  assert(releaseLogin);
  assert.equal(await form.getAttribute('aria-busy'), 'true');
  const progress = page.getByRole('status').filter({ hasText: '이메일로 로그인하고 있어요.' });
  assert.equal(await progress.count(), 1);
  assert.equal(await progress.evaluate(element => element.closest('[aria-busy="true"]')), null);
  // 처리 중 버튼: 이름은 "로그인하는 중", 누를 수 없지만 포커스는 그대로 남는다(aria-disabled).
  const busy = form.getByRole('button', { name: '로그인하는 중', exact: true });
  assert.equal(await busy.getAttribute('aria-disabled'), 'true');
  assert.equal(await busy.evaluate(element => element === document.activeElement), true);
  assert.equal(await busy.evaluate(element => getComputedStyle(element).cursor), 'not-allowed');
  await scan('이메일 요청 처리 중');
  releaseLogin();
  const resend = page.getByRole('button', { name: '확인 메일 다시 보내기', exact: true });
  await resend.waitFor();
  assert(await authAlert.evaluate(element => element === document.querySelector('main [role="alert"]')), '인증 오류는 기존 alert에 삽입');
  await resend.click();
  await page.getByText('확인 메일을 다시 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.', { exact: true }).waitFor();
  await scan('재전송 실패·재시도');
  await resend.click();
  await page.getByText('확인 메일을 다시 보냈어요. 메일함을 확인해 주세요.', { exact: true }).waitFor();
  await scan('재전송 성공');

  // 비밀번호 재설정: 같은 틀, 잘못된 이메일이면 칸으로 포커스, 보낸 뒤에는 결과 안내로 포커스.
  await page.goto(origin + '/reset-password');
  await page.addScriptTag({ content: axeSource });
  await scan('비밀번호 재설정');
  const resetSubmit = page.getByRole('button', { name: '재설정 링크 보내기', exact: true });
  await resetSubmit.click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'email');
  assert.equal(await page.locator('#email').getAttribute('aria-invalid'), 'true');
  await scan('비밀번호 재설정·오류');
  assert.deepEqual(pageErrors, []);
  console.log('PASS 포커스 색/Tab 순서/링크 이동/hover/cursor/Space/aria-disabled 포커스 유지/3개 너비/재설정, 브라우저 예외 0건');
} finally {
  releaseLogin?.();
  await browser.close();
}
