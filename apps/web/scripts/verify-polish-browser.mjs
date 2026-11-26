// 화면 다듬기(#293)를 운영 빌드에서 검사한다: 동의 화면 포커스, 모달 막, 날짜 달력, 주 이동, 문구.
// 사용: apps/web에서 `npx next start -p 3100` 뒤 `node scripts/verify-polish-browser.mjs`
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { routeSupabase, rows, scan, signIn, todayKst, user } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'msedge' }), headless: true });
const errors = [];
const DAY = 24 * 60 * 60 * 1000;
const shift = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

async function newPage() {
  const context = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul', viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await routeSupabase(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  return page;
}

try {
  // ── 1) 동의 화면: 제목으로 포커스는 옮기되 테두리는 그리지 않는다 ──
  const metadata = user.user_metadata;
  user.user_metadata = {};
  let page = await newPage();
  await signIn(page, origin, '/');
  const consentTitle = page.getByRole('heading', { level: 1, name: '서비스 이용 안내' });
  await consentTitle.waitFor();
  await page.waitForFunction(() => document.activeElement?.id === 'consent-title');
  assert.equal(await consentTitle.evaluate((element) => getComputedStyle(element).outlineStyle), 'none');
  user.user_metadata = metadata;
  await page.context().close();
  console.log('PASS 동의 화면: 열면 제목에 포커스(읽기용), 테두리 없음');

  // ── 2) 모달 막: 첫 사용 안내 카드 안에서 열어도 화면 전체(헤더 포함)를 덮는다 ──
  const saved = rows.splice(0, rows.length);
  page = await newPage();
  await signIn(page, origin, '/');
  await page.getByRole('button', { name: '직접 추가' }).click();
  const dialog = page.getByRole('dialog', { name: '지원 추가' });
  await dialog.waitFor();
  const cover = await page.evaluate(() => {
    const element = document.elementFromPoint(window.innerWidth / 2, 20); // 헤더 한가운데
    const scrim = element?.closest('.bg-scrim');
    const box = scrim?.getBoundingClientRect();
    return { inBody: scrim?.parentElement === document.body, width: box?.width, height: box?.height };
  });
  assert.deepEqual(cover, { inBody: true, width: 1280, height: 900 });

  // ── 3) 날짜 달력: 열기 → 오늘에 포커스 → 화살표로 다음 날 → Enter로 고르기 → 버튼으로 돌아옴 ──
  const appliedToggle = dialog.getByRole('button', { name: '지원일 달력 열기' });
  await appliedToggle.click();
  const calendar = dialog.getByRole('group', { name: '지원일 고르기' });
  await calendar.waitFor();
  assert.equal(await calendar.evaluate((element) => getComputedStyle(element).borderRadius), '16px');
  await page.waitForFunction((today) => document.activeElement?.getAttribute('data-date') === today, todayKst);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-current')), 'date');
  await scan(page, '지원 추가·날짜 달력');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction((date) => document.activeElement?.getAttribute('data-date') === date, shift(todayKst, 1));
  await page.keyboard.press('Enter');
  await calendar.waitFor({ state: 'detached' });
  assert.equal(await dialog.getByLabel('지원일 (필수)', { exact: true }).inputValue(), shift(todayKst, 1));
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '지원일 달력 열기');

  // Esc는 달력만 닫고 창은 그대로
  await appliedToggle.click();
  await calendar.waitFor();
  await page.keyboard.press('Escape');
  await calendar.waitFor({ state: 'detached' });
  assert.equal(await dialog.isVisible(), true);

  // 마감일: 다음 달 버튼 → 날짜 누르기, 다시 열어 지우기
  await dialog.getByRole('button', { name: '공고 마감일 달력 열기' }).click();
  const deadline = dialog.getByRole('group', { name: '공고 마감일 고르기' });
  await deadline.getByRole('button', { name: '다음 달' }).click();
  const nextMonth = shift(`${todayKst.slice(0, 7)}-01`, 40).slice(0, 7);
  await deadline.locator(`[data-date="${nextMonth}-15"]`).click();
  assert.equal(await dialog.getByLabel('공고 마감일', { exact: true }).inputValue(), `${nextMonth}-15`);
  await dialog.getByRole('button', { name: '공고 마감일 달력 열기' }).click();
  await deadline.getByRole('button', { name: '지우기' }).click();
  assert.equal(await dialog.getByLabel('공고 마감일', { exact: true }).inputValue(), '');
  // 칸에 직접 치는 것도 그대로
  await dialog.getByLabel('공고 마감일', { exact: true }).fill('2026-12-24');
  assert.equal(await dialog.getByLabel('공고 마감일', { exact: true }).inputValue(), '2026-12-24');
  rows.push(...saved);
  await page.context().close();
  console.log('PASS 모달 막: body에 그려 헤더까지 화면 전체 / 날짜 달력: 모서리 16·오늘 포커스·화살표·Enter·버튼으로 복귀·Esc는 달력만·다음 달·지우기·직접 입력·axe');

  // ── 4) 주 이동은 흰 바탕 + 테두리, 5) 문구 "끝난 지원" ──
  page = await newPage();
  await signIn(page, origin, '/board');
  const weekGroup = page.getByRole('group', { name: '주 이동' });
  await weekGroup.waitFor();
  const style = await weekGroup.evaluate((element) => ({ background: getComputedStyle(element).backgroundColor, border: getComputedStyle(element).borderTopWidth }));
  assert.deepEqual(style, { background: 'rgb(255, 255, 255)', border: '1px' });
  await page.getByText('끝난 지원', { exact: true }).waitFor();
  assert.equal(await page.getByText('결과 나옴').count(), 0);
  await page.context().close();
  console.log('PASS 주 이동: 흰 바탕·테두리 1px / 문구: 끝난 지원');

  assert.deepEqual(errors, []);
  console.log('PASS 화면 다듬기 전체, 브라우저 예외 0건');
} finally {
  await browser.close();
}
