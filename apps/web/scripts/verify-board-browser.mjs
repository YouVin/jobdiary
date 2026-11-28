// 지원 보드(#204)를 실제 Edge·앱으로 검사한다. Supabase HTTP는 fixture(예시 지원 50건, 중복 묶음 2개)로 대신한다.
// 사용: apps/web에서 개발 서버를 띄운 뒤 `node scripts/verify-board-browser.mjs`
//   TEST_ORIGIN(기본 http://localhost:3100), SHOT_DIR을 주면 세 보기를 1440·768·390px로 찍는다.
import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { routeSupabase, scan as scanPage, signIn } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const shotDir = process.env.SHOT_DIR;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
await routeSupabase(context);
const page = await context.newPage();
page.on('pageerror', (error) => pageErrors.push(error.message));
page.setDefaultTimeout(10000);
const scan = (name) => scanPage(page, name);

async function shoot(name) {
  if (!shotDir) return;
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} ${width}px 가로 넘침`);
    await page.screenshot({ path: path.join(shotDir, `board_${name}_${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

try {
  await signIn(page, origin, '/board');
  await page.getByRole('heading', { level: 1, name: '지원 보드' }).waitFor();
  const tabs = page.getByRole('group', { name: '보기 선택' });
  await tabs.getByRole('button', { name: '주간', pressed: true }).waitFor();
  await scan('주간');

  // 단계별 숫자: 누르면 아래 목록을 그 단계만, 다시 누르면 푼다
  const stages = page.getByRole('group', { name: '단계별 보기' });
  const screening = stages.getByRole('button', { name: /서류 통과/ });
  await screening.click();
  // 단계 거르기는 transition으로 바뀌어 한 박자 늦게 반영된다
  await stages.getByRole('button', { name: /서류 통과/, pressed: true }).waitFor();
  await page.locator('#waiting-title').getByText('서류 통과만').waitFor();
  await scan('주간·단계 거르기');
  await screening.click();
  await stages.getByRole('button', { name: /서류 통과/, pressed: false }).waitFor();

  // 주 이동
  const weekTitle = page.locator('#week-title');
  await page.getByRole('button', { name: '다음 주', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#week-title')?.textContent === '다음 주');
  await page.getByRole('button', { name: '이번 주', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#week-title')?.textContent === '이번 주');
  assert.equal(await weekTitle.textContent(), '이번 주');

  // 결과 기다리는 중: 트랙 점으로 단계 옮기기 (지원 완료 → 서류 통과)
  const moveButton = page.getByRole('button', { name: '서류 통과로 옮기기' }).first();
  const trackName = await moveButton.locator('xpath=ancestor::*[@role="group"][1]').getAttribute('aria-label');
  await moveButton.click();
  await page.getByRole('group', { name: trackName }).getByRole('button', { name: '서류 통과 (현재 단계)' }).waitFor();
  await shoot('week');

  // 보드: 검색·칩·키보드로 단계 옮기기
  await tabs.getByRole('button', { name: '보드' }).click();
  await page.locator('section[aria-labelledby="kanban-applied"]').waitFor();
  await scan('보드');
  const appliedColumn = page.locator('section[aria-labelledby="kanban-applied"]');
  const screeningColumn = page.locator('section[aria-labelledby="kanban-screening"]');
  const card = appliedColumn.locator('[aria-roledescription="옮길 수 있는 카드"]').first();
  const cardName = await card.getAttribute('aria-label');
  const company = cardName.split(',')[0];
  const columnCount = async () => Number((await page.locator('#kanban-screening').textContent()).match(/(\d+)건/)[1]);
  const before = await columnCount();
  await card.focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  await page.keyboard.press('Space');
  // 화면 읽기 프로그램 안내(dnd-kit 알림 영역)와 열 건수로 확인한다. 열은 처음 5장만 보여 옮긴 카드가 가려질 수 있다.
  await page.getByText(`${company} 카드를 서류 통과 단계에 놓았어요.`).waitFor({ state: 'attached' });
  await page.waitForFunction((expected) => Number(document.querySelector('#kanban-screening').textContent.match(/(\d+)건/)[1]) === expected, before + 1);
  console.log(`PASS 키보드로 "${company}" 카드를 지원 완료 → 서류 통과로 옮김`);

  // Enter는 상세 패널, Esc로 닫기
  await appliedColumn.locator('[aria-roledescription="옮길 수 있는 카드"]').first().focus();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });

  // 검색과 지원 경로 칩
  const search = page.getByRole('searchbox', { name: '회사나 직무 검색' });
  await search.fill('가람');
  await page.getByRole('status').filter({ hasText: /50건 중 \d+건/ }).waitFor();
  await search.fill('');
  const chips = page.getByRole('group', { name: '지원 경로' });
  await chips.getByRole('button', { name: /^원티드/ }).click();
  assert.equal(await chips.getByRole('button', { name: /^원티드/ }).getAttribute('aria-pressed'), 'true');
  await scan('보드·거르기');
  await chips.getByRole('button', { name: /^전체/ }).click();
  await shoot('kanban');

  // 중복: 숫자 3칸과 묶음
  await tabs.getByRole('button', { name: /중복/ }).click();
  const summary = page.getByRole('region', { name: '중복 요약' });
  await summary.waitFor();
  assert.match(await summary.textContent(), /중복 묶음2개/);
  assert.equal(await page.getByRole('article').count(), 2);
  await scan('중복');
  await shoot('duplicates');

  assert.deepEqual(pageErrors, []);
  console.log('PASS 세 보기·단계 거르기·주 이동·트랙 단계 옮기기·칸반 키보드 옮기기·Enter 상세·검색·칩·중복 숫자, 브라우저 예외 0건');
} finally {
  await browser.close();
}
