// 첫 사용 안내(#272)를 실제 브라우저·운영 빌드로 검사한다. Supabase HTTP는 fixture(빈 계정)로 대신한다.
// 사용: apps/web에서 `npx next start -p 3100`을 띄운 뒤 `node scripts/verify-getting-started-browser.mjs` (SHOT_DIR을 주면 화면을 찍는다)
import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { routeSupabase, rows, scan as scanPage, signIn } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const shotDir = process.env.SHOT_DIR;
const STORE_URL = 'https://chromewebstore.google.com/detail/afnboeihbppogfinbickjaaadcgjkmil';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
rows.splice(0, rows.length); // 빈 계정

const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'msedge' }), headless: true });
const errors = [];

async function open({ userAgent, extension = false, width = 1440 } = {}) {
  const context = await browser.newContext({ userAgent, viewport: { width, height: 900 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  if (extension) {
    // 익스텐션이 설치돼 있으면 페이지에 chrome.runtime.sendMessage가 생긴다. 가져오기 요청에는 빈 결과로 답한다.
    await context.addInitScript(() => {
      const runtime = { lastError: undefined, sendMessage(_id, _message, callback) { setTimeout(() => callback?.(undefined), 10); } };
      // Chromium의 window.chrome은 다시 정의할 수 없어, 있으면 runtime만 붙인다
      if (window.chrome) Object.defineProperty(window.chrome, 'runtime', { value: runtime, configurable: true });
      else Object.defineProperty(window, 'chrome', { value: { runtime }, configurable: true });
    });
  }
  await routeSupabase(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(10000);
  await signIn(page, origin);
  await page.getByRole('heading', { level: 1, name: '흩어진 지원 내역을 한곳에 모아 볼까요?' }).waitFor();
  return { context, page };
}

try {
  // 1) PC, 익스텐션 없음: 설치 버튼(웹스토어 새 탭)·사이트 링크 3개·직접 추가
  {
    const { context, page } = await open();
    const steps = page.getByRole('list').filter({ has: page.getByRole('heading', { name: '크롬 익스텐션 설치하기' }) });
    assert.equal(await steps.getByRole('listitem').count(), 3);
    const store = page.getByRole('link', { name: /크롬 웹스토어에서 설치/ });
    assert.equal(await store.getAttribute('href'), STORE_URL);
    assert.equal(await store.getAttribute('target'), '_blank');
    for (const site of ['사람인', '잡코리아', '원티드']) await page.getByRole('link', { name: new RegExp(`^${site} 지원현황`) }).waitFor();
    assert.equal(await page.getByText('익스텐션은 PC의 크롬에서만').count(), 0, 'PC에서는 휴대폰 안내 없음');
    assert.equal(await page.getByRole('heading', { level: 2, name: '전형 여정' }).count(), 0, '빈 통계 카드 없음');
    await scanPage(page, '첫 사용·익스텐션 없음');
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px 가로 넘침`);
      if (shotDir) await page.screenshot({ path: path.join(shotDir, `getting-started-${width}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    // 직접 추가 → 창 → 저장하면 홈이 원래 대시보드로 바뀐다
    await page.getByRole('button', { name: '직접 추가' }).click();
    const dialog = page.getByRole('dialog', { name: '지원 추가' });
    await dialog.getByLabel('회사명 (필수)').fill('가람소프트');
    await dialog.getByRole('button', { name: '지원 추가', exact: true }).click();
    await dialog.waitFor({ state: 'detached' });
    await page.getByRole('heading', { level: 2, name: '전형 여정' }).waitFor();
    assert.equal(await page.getByRole('heading', { name: '흩어진 지원 내역을 한곳에 모아 볼까요?' }).count(), 0);
    console.log('PASS PC·익스텐션 없음: 설치 버튼·사이트 링크 3개·3개 너비·axe, 직접 추가 저장하면 대시보드로');
    rows.splice(0, rows.length);
    await context.close();
  }

  // 2) PC, 익스텐션 있음: 1단계 완료 표시, 설치 버튼 없음
  {
    const { context, page } = await open({ extension: true });
    await page.getByText('이 브라우저에 취준일기 익스텐션이 연결돼 있어요.').waitFor();
    assert.equal(await page.getByRole('link', { name: /크롬 웹스토어에서 설치/ }).count(), 0);
    await scanPage(page, '첫 사용·익스텐션 있음');
    console.log('PASS PC·익스텐션 있음: 1단계 완료');
    await context.close();
  }

  // 3) 휴대폰: PC에서 이어서 안내가 단계보다 먼저
  {
    const { context, page } = await open({ userAgent: IPHONE_UA, width: 390 });
    const note = page.getByRole('note');
    await note.waitFor();
    assert.match(await note.textContent(), /PC의 크롬에서만/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await scanPage(page, '첫 사용·휴대폰');
    if (shotDir) await page.screenshot({ path: path.join(shotDir, 'getting-started-iphone.png'), fullPage: true });
    console.log('PASS 휴대폰: PC에서 이어서 안내·390px·axe');
    await context.close();
  }

  assert.deepEqual(errors, []);
  console.log('첫 사용 안내 검증: 3개 통과, 브라우저 예외 0건');
} finally {
  await browser.close();
}
