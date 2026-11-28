// 홈 대시보드(#203)를 실제 Edge·앱으로 검사한다. Supabase HTTP는 fixture(예시 지원 50건, scripts/fixtures/sampleSession.mjs)로 대신한다.
// 사용: apps/web에서 개발 서버를 띄운 뒤 `node scripts/verify-dashboard-browser.mjs`
//   TEST_ORIGIN(기본 http://localhost:3100), SHOT_DIR을 주면 1440·768·390px 전체 화면을 그 폴더에 찍는다.
import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { routeSupabase, rows, scan as scanPage, signIn } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const shotDir = process.env.SHOT_DIR;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext();
const pageErrors = [];
await routeSupabase(context);
const page = await context.newPage();
page.on('pageerror', (error) => pageErrors.push(error.message));
page.setDefaultTimeout(10000);
const scan = (name) => scanPage(page, name);

try {
  await signIn(page, origin);
  const heading = page.getByRole('heading', { level: 1 });
  await heading.waitFor();

  // 요약: 문장 h1이 전체·진행 중 건수를 말한다
  const inProgress = rows.filter((row) => ['applied', 'screening', 'interview', 'interviewed'].includes(row.status)).length;
  assert.equal(await heading.textContent(), `지금까지 50건 지원했고, ${inProgress}건이 소식을 기다리고 있어요`);
  assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
  for (const name of ['전형 여정', '지원 경로', '다가오는 일정', '주간 지원']) await page.getByRole('heading', { level: 2, name }).waitFor();
  // 차트는 모든 값을 문장으로 읽는다
  assert.match(await page.getByRole('img', { name: /^진행 중 \d+건과 합격 \d+건: 지원 완료 \d+, 서류 통과 \d+, 면접 \d+, 합격 \d+$/ }).getAttribute('aria-label'), /지원 완료/);
  assert.equal(await page.getByRole('img', { name: /^지원 경로 비율: / }).count(), 1);
  assert.equal(await page.getByRole('img', { name: /^최근 8주 주간 지원 수: / }).count(), 1);
  await scan('홈');

  // 키보드: 첫 Tab은 본문으로 건너뛰기
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), '본문으로 건너뛰기');

  // 계정 메뉴: 열면 첫 항목, Esc는 닫고 버튼으로 돌아온다
  const accountButton = page.getByRole('button', { name: '내 계정', exact: true });
  await accountButton.click();
  assert.equal(await accountButton.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), '계정 설정');
  await scan('계정 메뉴 열림');
  await page.keyboard.press('Escape');
  assert.equal(await accountButton.getAttribute('aria-expanded'), 'false');
  assert.equal(await accountButton.evaluate((element) => element === document.activeElement), true);

  // 달력: 지원한 날을 누르면 그날 회사 목록, 회사를 누르면 상세 패널
  const calendar = page.getByRole('group', { name: /날짜별 지원$/ });
  const dayButton = calendar.getByRole('button').first();
  const dayLabel = await dayButton.getAttribute('aria-label');
  assert.match(dayLabel, /^\d+월 \d+일 .요일(, 오늘)?, 지원 \d+곳/);
  // 목록이 열려 줄이 높아져도 주간 지원 막대 높이는 그대로, 남는 공간은 위아래 여백(#320)
  const barArea = page.locator('[aria-labelledby="weekly-title"] .grid').first();
  const barHeightBefore = (await barArea.boundingBox()).height;
  await dayButton.click();
  assert.equal(await dayButton.getAttribute('aria-pressed'), 'true');
  const list = page.getByRole('region', { name: /지원 \d+곳$/ });
  await list.waitFor();
  assert(Math.abs((await barArea.boundingBox()).height - barHeightBefore) < 0.5, '달력 목록을 열어도 막대 높이 그대로');
  await scan('달력 날짜 목록');
  await list.getByRole('button', { name: /기록·상세 보기$/ }).first().click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });

  // 달력 지난달·다음 달
  const monthTitle = page.locator('#calendar-title');
  const before = await monthTitle.textContent();
  await page.getByRole('button', { name: '지난달' }).click();
  assert.notEqual(await monthTitle.textContent(), before);
  await page.getByRole('button', { name: '이번 달', exact: true }).click();
  assert.equal(await monthTitle.textContent(), before);

  // 다가오는 일정: 펼치기. 같은 줄 카드는 늘어나지 않고 펼친 목록이 카드 안에서 스크롤된다(#320)
  const more = page.getByRole('button', { name: /^나머지 \d+건 보기$/ });
  if (await more.count()) {
    const rowHeights = () => page.evaluate(() => ['upcoming-title', 'weekly-title', 'calendar-title'].map((id) => document.querySelector(`[aria-labelledby="${id}"]`).getBoundingClientRect().height));
    const before = await rowHeights();
    await more.click();
    await page.getByRole('button', { name: '접기' }).waitFor();
    const after = await rowHeights();
    for (let index = 0; index < before.length; index += 1) assert(Math.abs(after[index] - before[index]) < 0.5, `펼쳐도 카드 높이 그대로: ${before} → ${after}`);
    const list = await page.locator('[aria-labelledby="upcoming-title"] [class*="contain-size"]').evaluate((element) => ({ client: element.clientHeight, scroll: element.scrollHeight }));
    assert(list.scroll > list.client, '펼친 목록은 카드 안에서 스크롤');
    // 아래에 더 있으면 끝을 흐리게, 끝까지 내리면 흐림을 없앤다
    const fade = page.locator('[aria-labelledby="upcoming-title"] [aria-hidden="true"].sticky');
    await fade.waitFor();
    await page.locator('[aria-labelledby="upcoming-title"] [class*="contain-size"]').evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
    await fade.waitFor({ state: 'detached' });
  }

  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px 가로 넘침`);
    if (shotDir) await page.screenshot({ path: path.join(shotDir, `dashboard_${width}.png`), fullPage: true });
  }
  await scan('390px');
  assert.deepEqual(pageErrors, []);
  console.log('PASS 요약 문장·차트 이름·건너뛰기·계정 메뉴 Esc·달력 목록→상세 패널(막대 높이 그대로)·달 이동·일정 펼치기(카드 높이 그대로)·3개 너비, 브라우저 예외 0건');
} finally {
  await browser.close();
}
