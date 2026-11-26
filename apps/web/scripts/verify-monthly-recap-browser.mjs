// 이번 달 돌아보기(#275)를 운영 빌드에서 검사한다. 예시 지원 50건 fixture.
// 사용: apps/web에서 `npx next start -p 3100` 뒤 `node scripts/verify-monthly-recap-browser.mjs` (SHOT_DIR을 주면 만든 PNG를 저장)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { routeSupabase, scan, signIn } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const shotDir = process.env.SHOT_DIR;
const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'msedge' }), headless: true });
const errors = [];
try {
  const context = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  await routeSupabase(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  await signIn(page, origin);

  // 홈 요약 카드의 버튼 → 창 → 카드 이미지(대체 글에 숫자) → 저장 링크
  const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', month: 'numeric' }).format(new Date());
  const open = page.getByRole('button', { name: `${month}월 돌아보기` });
  await open.click();
  const dialog = page.getByRole('dialog', { name: `${month}월 돌아보기` });
  const image = dialog.getByRole('img', { name: new RegExp(`^${month}월 돌아보기 카드: ${month}월에 \\d+곳 지원, 서류 통과 이상 \\d+곳, 면접 \\d+번`) });
  await image.waitFor();
  const size = await image.evaluate((element) => [element.naturalWidth, element.naturalHeight]);
  assert.deepEqual(size, [1080, 1350]);
  const save = dialog.getByRole('link', { name: '이미지 저장' });
  assert.match(await save.getAttribute('download'), /^취준일기-\d{4}-\d{2}\.png$/);
  assert.equal(await dialog.getByText('가상', { exact: false }).count(), 0, '회사 이름 없음');
  await scan(page, '이번 달 돌아보기');
  if (shotDir) {
    const base64 = await image.evaluate(async (element) => {
      const blob = await (await fetch(element.src)).blob();
      return await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(blob); });
    });
    fs.writeFileSync(path.join(shotDir, 'monthly-recap.png'), Buffer.from(base64, 'base64'));
  }
  // Esc로 닫으면 버튼으로 포커스가 돌아온다
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  assert.equal(await open.evaluate((element) => element === document.activeElement), true);
  assert.deepEqual(errors, []);
  console.log('PASS 이번 달 돌아보기: 버튼 → 1080×1350 카드·대체 글·저장 링크·회사 이름 없음·axe·Esc 포커스 복귀, 브라우저 예외 0건');
} finally {
  await browser.close();
}
