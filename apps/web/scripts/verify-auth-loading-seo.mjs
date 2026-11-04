// 운영 계정 없이 서버 HTML/메타데이터와 세션 확인 대기 화면을 검증한다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const canonicalOrigin = 'https://jobdiary.vercel.app';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
  const page = await context.newPage();
  for (const [path, title] of [['/login?import=1', '로그인 및 회원가입'], ['/terms', '이용약관'], ['/privacy', '개인정보처리방침']]) {
    const response = await page.goto(origin + path);
    assert.equal(response.status(), 200);
    assert.equal(await page.title(), `${title} | 취준일기`);
    const cleanPath = path.split('?')[0];
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), canonicalOrigin + cleanPath);
    assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'), canonicalOrigin + cleanPath);
    assert((await page.locator('meta[name="description"]').getAttribute('content')).length > 20);
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /index, follow/);
    assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute('content'), 'summary');
  }
  console.log('PASS 공개 페이지 서버 title/description/canonical/OG/Twitter');
  for (const path of ['/', '/account', '/reset-password', '/update-password']) {
    await page.goto(origin + path);
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  }
  const robots = await context.request.get(origin + '/robots.txt');
  assert.equal(robots.status(), 200);
  assert.match(await robots.text(), /Allow: \//);
  assert((await robots.text()).includes(`${canonicalOrigin}/sitemap.xml`));
  const sitemap = await context.request.get(origin + '/sitemap.xml');
  assert.equal(sitemap.status(), 200);
  const xml = await sitemap.text();
  assert.equal((xml.match(/<loc>/g) || []).length, 3);
  for (const path of ['/login', '/terms', '/privacy']) assert(xml.includes(`${canonicalOrigin}${path}`));
  assert(!xml.includes('/account'));
  console.log('PASS 개인/복구 페이지 noindex, robots/sitemap HTTP');
  await page.goto(origin + '/login');
  const skeleton = page.getByRole('status');
  assert.equal(await skeleton.getAttribute('aria-busy'), null);
  assert.equal(await skeleton.locator('input,button,a').count(), 0);
  assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  assert.equal(await skeleton.locator('[aria-hidden="true"]').evaluate(element => getComputedStyle(element).animationName), 'none');
  console.log('PASS JS 실행 전 스켈레톤·서버 제목·3개 너비·reduced-motion');
  await context.close();

  const dynamic = await browser.newContext();
  let release;
  await dynamic.route('https://*.supabase.co/**', async route => {
    if (new URL(route.request().url()).pathname !== '/auth/v1/user') throw new Error('예상하지 않은 인증 요청');
    await new Promise(resolve => { release = resolve; });
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'test expired callback', code: 'bad_jwt' }) });
  });
  const pendingPage = await dynamic.newPage();
  const errors = [];
  pendingPage.on('pageerror', error => errors.push(error.message));
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'test-user', exp: Math.floor(Date.now() / 1000) + 3600 })}.test`;
  try {
    await pendingPage.goto(`${origin}/login#access_token=${token}&refresh_token=test&expires_in=3600&token_type=bearer`);
    await pendingPage.getByRole('status').waitFor();
    for (let i = 0; !release && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 20));
    assert(release, '세션 확인 HTTP 시작');
    assert.equal(await pendingPage.getByRole('button', { name: 'Google로 계속하기', exact: true }).count(), 0);
    await pendingPage.addScriptTag({ content: fs.readFileSync('node_modules/.release-tools/node_modules/axe-core/axe.min.js', 'utf8') });
    const violations = await pendingPage.evaluate(async () => (await window.axe.run(document)).violations.map(item => item.id));
    assert.deepEqual(violations, []);
    release();
    await pendingPage.getByRole('button', { name: 'Google로 계속하기', exact: true }).waitFor();
    assert.equal(await pendingPage.getByRole('status').filter({ hasText: '화면을 준비하고 있습니다.' }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS 세션 지연 중 스켈레톤/axe → 종료 후 실제 폼, 브라우저 예외 0건');
  } finally {
    release?.();
    await dynamic.close();
  }
} finally {
  await browser.close();
}
