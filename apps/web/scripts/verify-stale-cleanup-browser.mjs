// 소식 없는 지원 한 번에 정리(#277)를 운영 빌드에서 검사한다. 예시 지원 50건 fixture.
// 사용: apps/web에서 `npx next start -p 3100` 뒤 `node scripts/verify-stale-cleanup-browser.mjs`
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { routeSupabase, rows, scan, signIn } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'msedge' }), headless: true });
const errors = [];
try {
  const context = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  await routeSupabase(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  await signIn(page, origin, '/board');

  // 버튼의 건수 = 기다리는 목록의 "소식 없음" 줄 수
  const open = page.getByRole('button', { name: /^소식 없는 \d+건 정리$/ });
  const staleCount = Number((await open.textContent()).match(/\d+/)[0]);
  assert.ok(staleCount >= 2, '예시 데이터에 소식 없는 지원이 2건 이상');
  await open.click();
  const dialog = page.getByRole('dialog', { name: '소식 없는 지원 정리' });
  const boxes = dialog.getByRole('checkbox');
  assert.equal(await boxes.count(), staleCount);
  for (let index = 0; index < staleCount; index += 1) assert.equal(await boxes.nth(index).isChecked(), true, '처음엔 모두 고름');
  await scan(page, '소식 없는 지원 정리');

  // 하나는 남기고 나머지를 탈락으로
  const kept = (await boxes.first().locator('xpath=..').textContent()).split(' · ')[0];
  await boxes.first().uncheck();
  await dialog.getByRole('button', { name: `${staleCount - 1}건 탈락으로 옮기기` }).click();
  await dialog.waitFor({ state: 'detached' });
  const toast = page.getByText(`${staleCount - 1}건을 탈락으로 옮겼어요`);
  await toast.waitFor();
  const rejected = rows.filter((row) => row.status === 'rejected' && row.status_source === 'manual').length;
  assert.ok(rejected >= staleCount - 1, '서버(fixture)에 탈락·수동으로 저장');
  assert.equal(rows.find((row) => row.company === kept)?.status, 'applied', '끈 곳은 그대로');
  assert.equal(await page.getByRole('button', { name: /^소식 없는 \d+건 정리$/ }).textContent(), '소식 없는 1건 정리');

  // 되돌리기: 지원 완료로
  await page.getByRole('button', { name: '되돌리기' }).click();
  await page.getByText(`${staleCount - 1}건을 지원 완료로 되돌렸어요`).waitFor();
  await page.getByRole('button', { name: `소식 없는 ${staleCount}건 정리` }).waitFor();
  assert.deepEqual(errors, []);
  console.log(`PASS 소식 없는 지원 정리: ${staleCount}건 모두 골라 둠·하나 남기고 탈락·저장·되돌리기·axe, 브라우저 예외 0건`);
} finally {
  await browser.close();
}
