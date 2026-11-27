// 단계 변경 이력(#283)을 운영 빌드에서 검사한다. 예시 지원 fixture(이력 포함, 40번부터는 이력 없는 예전 지원).
// 사용: apps/web에서 `npx next start -p 3100` 뒤 `node scripts/verify-status-history-browser.mjs`
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { routeSupabase, rows, scan, signIn, todayKst } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';

// ── 기대값: 탈락한 곳도 어디까지 갔는지로 센다 ──
// 예시 데이터에서 면접 후 탈락은 10으로 나눈 나머지가 5인 지원(이력이 있거나, 예전 지원은 면접 날짜로 추정)
const live = rows.filter((row) => row.status !== 'canceled');
const afterInterview = (row) => row.status === 'rejected' && Number(row.id.slice(-12)) % 10 === 5;
const passed = live.filter((row) => ['screening', 'interview', 'interviewed', 'offer'].includes(row.status) || afterInterview(row));
const interviewed = live.filter((row) => ['interview', 'interviewed', 'offer'].includes(row.status) || afterInterview(row));
const offers = live.filter((row) => row.status === 'offer');
const expectedRate = Math.round((passed.length / live.length) * 100);
const oldRate = Math.round((live.filter((row) => ['screening', 'interview', 'interviewed', 'offer'].includes(row.status)).length / live.length) * 100);
assert.ok(expectedRate > oldRate, '예시 데이터로 고치기 전과 차이가 나야 검사가 의미 있다');

const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'msedge' }), headless: true });
const errors = [];
try {
  const context = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  await routeSupabase(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);

  // ── 홈: 서류 통과율과 지나온 단계 흐름·걸린 날 ──
  await signIn(page, origin, '/');
  const rate = page.locator('dt', { hasText: '서류 통과율' }).locator('xpath=following-sibling::dd');
  // 숫자 칸은 올라가는 숫자(aria-hidden)와 읽기용 값(sr-only)을 함께 둔다. 다 올라간 뒤 화면 숫자를 본다
  await page.waitForFunction(([element, expected]) => element?.querySelector('[aria-hidden]')?.textContent === expected, [await rate.elementHandle(), String(expectedRate)]);
  assert.equal(await rate.locator('.sr-only').textContent(), String(expectedRate));
  const funnel = page.getByRole('region', { name: '지금까지 지나온 단계' });
  const steps = await funnel.getByRole('listitem').allInnerTexts();
  const numbers = steps.map((text) => Number(text.match(/\n(\d+)/)[1]));
  assert.deepEqual(numbers, [live.length, passed.length, interviewed.length, offers.length]);
  // 비율은 기준을 글자로 보인다(#293): 서류 통과 아래 "지원의 44%", 면접 아래 "서류 통과의 N%"
  assert.match(steps[1], new RegExp(`지원의 ${Math.round((passed.length / live.length) * 100)}%`));
  assert.match(steps[2], new RegExp(`서류 통과의 ${Math.round((interviewed.length / passed.length) * 100)}%`));
  await funnel.getByText(/서류 통과 연락까지 평균 \d+일 · 면접 후 결과까지 평균 \d+일/).waitFor();
  await scan(page, '홈·지나온 단계');

  // ── 보드: 어디서 떨어졌는지 카드에 ──
  await page.goto(`${origin}/board`);
  await page.getByRole('group', { name: '보기 선택' }).getByRole('button', { name: '보드', exact: true }).click();
  // 열마다 몇 건만 보이므로 접힌 카드를 모두 펼친다
  const more = page.getByRole('button', { name: /건 더 보기$/ });
  await more.first().waitFor();
  while ((await more.count()) > 0) await more.first().click();
  const target = rows[5]; // 이력 있는 면접 후 탈락
  const card = page.getByRole('button', { name: `${target.company}, ${target.position}, 면접 후 탈락`, exact: true });
  await card.getByText('면접 후 탈락', { exact: true }).waitFor();
  const old = rows[45]; // 이력 없는 예전 지원, 면접 날짜로 추정
  assert.deepEqual(old.status_history, []);
  await page.getByRole('button', { name: `${old.company}, ${old.position}, 면접 후 탈락`, exact: true }).waitFor();

  // ── 상세 패널: 지나온 기록에 단계가 바뀐 날 ──
  await card.click();
  let panel = page.getByRole('dialog', { name: target.company });
  const journey = panel.getByRole('region', { name: '지나온 기록' });
  // 한 줄은 "10.29 (목)" 다음 줄에 이름. 새로운 것이 위, 면접 일정 사이에 단계 변경이 끼어 있다
  const labels = (await journey.getByRole('listitem').allInnerTexts()).map((text) => text.split('\n')[1]);
  assert.deepEqual(labels, ['탈락', '면접', '면접 예정', '서류 통과', '지원했어요']);
  assert.equal(await journey.getByText(/11월 26일 전에 바뀐 단계는/).count(), 0);
  await scan(page, '상세 패널·단계 변경 기록');
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'detached' });

  await page.getByRole('button', { name: `${old.company}, ${old.position}, 면접 후 탈락`, exact: true }).click();
  panel = page.getByRole('dialog', { name: old.company });
  await panel.getByText('11월 26일 전에 바뀐 단계는 날짜가 남아 있지 않아요. 앞으로 바뀌는 단계는 자동으로 남아요.').waitFor();
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'detached' });

  // ── 단계를 옮기면 오늘 날짜로 바로 남는다 (DB 트리거 흉내) ──
  const moving = rows[4]; // 서류 통과
  await page.getByRole('button', { name: `${moving.company}, ${moving.position}, 서류 통과`, exact: true }).click();
  panel = page.getByRole('dialog', { name: moving.company });
  await panel.getByRole('group', { name: `${moving.company} 단계` }).getByRole('button', { name: /^면접 예정(으)?로 옮기기$/ }).click();
  for (let attempt = 0; moving.status !== 'interview' && attempt < 100; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(moving.status, 'interview');
  assert.equal(moving.status_history.at(-1).from, 'screening');
  const [month, day] = todayKst.slice(5).split('-').map(Number);
  const latest = panel.getByRole('region', { name: '지나온 기록' }).getByRole('listitem').first();
  await latest.getByText('면접 예정', { exact: true }).waitFor();
  assert.match(await latest.innerText(), new RegExp(`^${month}\\.${day} `));

  assert.deepEqual(errors, []);
  console.log(`PASS 단계 이력: 서류 통과율 ${oldRate}% → ${expectedRate}%(면접 후 탈락 포함)·지나온 단계 ${numbers.join('→')}·평균 걸린 날·보드 "면접 후 탈락"(이력·추정)·지나온 기록 단계 날짜·예전 지원 안내·옮기면 오늘 기록·axe, 브라우저 예외 0건`);
} finally {
  await browser.close();
}
