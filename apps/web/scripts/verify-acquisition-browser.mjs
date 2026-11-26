// 가입 경로(#290)를 운영 빌드에서 검사한다: 쓰레드 링크로 소개 페이지 → 로그인·동의 → 서버에 한 번 → 브라우저에서 지움.
// 사용: apps/web에서 `npx next start -p 3100` 뒤 `node scripts/verify-acquisition-browser.mjs`
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { acquisitionRequests, routeSupabase, signIn } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const KEY = 'jobdiary:acquisition';
const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'msedge' }), headless: true });
const errors = [];
try {
  const context = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  await routeSupabase(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  const stored = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);

  // ── 바로 들어온 방문은 기억하지 않는다 ──
  await page.goto(`${origin}/intro`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  assert.equal(await stored(), null);

  // ── 쓰레드 링크: utm과 첫 경로만 기억, 다른 쿼리는 버림 ──
  await page.goto(`${origin}/intro?utm_source=threads&utm_medium=social&utm_campaign=launch_2026_11&fbclid=abc`);
  await page.waitForFunction((key) => localStorage.getItem(key) !== null, KEY);
  const first = await stored();
  assert.deepEqual([first.source, first.medium, first.campaign, first.landing, first.referrer], ['threads', 'social', 'launch_2026_11', '/intro', null]);

  // 같은 브라우저에서 다른 링크로 다시 와도 첫 출처를 지킨다
  await page.goto(`${origin}/intro?utm_source=kakao`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  assert.equal((await stored()).source, 'threads');
  assert.equal(acquisitionRequests.length, 0, '로그인 전에는 보내지 않는다');

  // ── 로그인·동의를 마치면 한 번 보내고 지운다 ──
  await signIn(page, origin, '/');
  await page.getByRole('heading', { level: 1 }).waitFor();
  for (let attempt = 0; acquisitionRequests.length === 0 && attempt < 100; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepEqual(acquisitionRequests, [{ p_source: 'threads', p_medium: 'social', p_campaign: 'launch_2026_11', p_referrer: null, p_landing: '/intro' }]);
  await page.waitForFunction((key) => localStorage.getItem(key) === null, KEY);

  // 새로고침·화면 이동해도 다시 보내지 않는다
  await page.reload();
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.goto(`${origin}/board`);
  await page.getByRole('heading', { level: 1, name: '지원 보드' }).waitFor();
  assert.equal(acquisitionRequests.length, 1);

  assert.deepEqual(errors, []);
  console.log('PASS 가입 경로: 바로 온 방문 기억 안 함·쓰레드 링크 utm과 첫 경로만·첫 출처 유지·로그인 전 전송 없음·동의 뒤 1번 전송 후 지움·새로고침 재전송 없음, 브라우저 예외 0건');
} finally {
  await browser.close();
}
