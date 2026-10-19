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
  await scan('로그인');
  assert.equal(await page.getByRole('main').count(), 1);
  assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
  const modes = page.getByRole('group', { name: '로그인 또는 회원가입 선택' });
  const signup = modes.getByRole('button', { name: '회원가입', exact: true });
  await page.getByRole('heading', { name: '다시 오셨네요', exact: true }).click();
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => ({ outline: getComputedStyle(document.activeElement).outlineWidth, visible: document.activeElement.matches(':focus-visible') }));
  assert.equal(focused.visible, true);
  assert.equal(focused.outline, '2px');
  await signup.focus();
  await page.keyboard.press('Space');
  assert.equal(await signup.getAttribute('aria-pressed'), 'true');
  await scan('가입·빈 필드');
  const submit = page.getByRole('form', { name: '이메일 회원가입' }).getByRole('button', { name: '회원가입', exact: true });
  await page.mouse.move(0, 0);
  const normal = await submit.evaluate(element => getComputedStyle(element).backgroundColor);
  await submit.hover();
  await page.waitForTimeout(200);
  assert.notEqual(await submit.evaluate(element => getComputedStyle(element).backgroundColor), normal);
  assert.equal(await submit.evaluate(element => getComputedStyle(element).cursor), 'pointer');
  await submit.click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'email');
  assert.equal(await page.locator('#terms').getAttribute('aria-describedby'), 'terms-error');
  await scan('가입·필수 오류');
  await page.getByLabel('이메일', { exact: true }).fill('test@example.test');
  await page.getByLabel('비밀번호', { exact: true }).fill('123456');
  await page.getByText('비밀번호 강도: 약함', { exact: true }).waitFor();
  const toggle = page.locator('button[aria-controls="password"]');
  await toggle.focus();
  await page.keyboard.press('Space');
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#password').getAttribute('type'), 'text');
  await scan('가입·비밀번호 강도/표시');
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await modes.getByRole('button', { name: '로그인', exact: true }).click();
  const form = page.getByRole('form', { name: '이메일 로그인', exact: true });
  await form.getByRole('button', { name: '로그인', exact: true }).click();
  for (let i = 0; !releaseLogin && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 20));
  assert(releaseLogin);
  assert.equal(await form.getAttribute('aria-busy'), 'true');
  const busy = form.getByRole('button', { name: '처리 중...', exact: true });
  assert(await busy.isDisabled());
  assert.equal(await busy.evaluate(element => getComputedStyle(element).cursor), 'not-allowed');
  await scan('이메일 요청 처리 중');
  releaseLogin();
  const resend = page.getByRole('button', { name: '확인 메일 재전송', exact: true });
  await resend.click();
  await page.getByText('재전송에 실패했습니다. 잠시 후 다시 시도해주세요.', { exact: true }).waitFor();
  await scan('재전송 실패·재시도');
  await resend.click();
  await page.getByText('확인 메일을 다시 보냈습니다. 메일함을 확인해주세요.', { exact: true }).waitFor();
  await scan('재전송 성공');
  assert.deepEqual(pageErrors, []);
  console.log('PASS hover/cursor/focus/Space/disabled/3개 너비, 브라우저 예외 0건');
} finally {
  releaseLogin?.();
  await browser.close();
}
