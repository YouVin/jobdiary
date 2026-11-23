// README 화면 이미지를 다시 찍는다 (#206). 프로덕션 빌드(next start)에서 예시 데이터(scripts/fixtures/sampleSession.mjs)로 찍는다.
// 사용: apps/web에서 `npm run build && npx next start -p 3100` 뒤 `node scripts/capture-readme-screens.mjs`
//   TEST_ORIGIN(기본 http://localhost:3100), OUT_DIR(기본 ../../docs/images)
// 회사 이름과 숫자는 지어낸 예시 데이터다. 움직임은 끈 상태(reducedMotion)로 찍어 숫자가 올라가는 도중이 찍히지 않게 한다.
import path from 'node:path';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { routeSupabase, signIn } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const outDir = process.env.OUT_DIR || path.resolve('../../docs/images');
const browser = await chromium.launch({ channel: 'msedge', headless: true });

try {
  // 로그인 화면 (로그인 전)
  const guest = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const login = await guest.newPage();
  await login.goto(`${origin}/login`);
  await login.getByRole('button', { name: 'Google로 계속하기' }).waitFor();
  await login.waitForTimeout(500);
  await login.screenshot({ path: path.join(outDir, 'web-login.png') });
  await guest.close();

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await routeSupabase(context);
  const page = await context.newPage();
  await signIn(page, origin);
  await page.locator('#summary-title').waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'web-home-dashboard.png'), fullPage: true });

  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: /지원 보드/ }).click();
  await page.getByRole('heading', { level: 1, name: '지원 보드' }).waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'web-board-week.png') });

  await page.getByRole('region', { name: /결과 기다리는 중/ }).getByRole('button', { name: / 상세 보기$/ }).first().click();
  await page.getByRole('dialog').waitFor();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, 'web-board-panel.png') });
  console.log(`README 화면 4장을 ${outDir}에 저장했어요`);
} finally {
  await browser.close();
}
