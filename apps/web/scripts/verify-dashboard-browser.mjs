// 홈 대시보드(#203)를 실제 Edge·앱으로 검사한다. Supabase HTTP는 fixture(예시 지원 50건)로 대신한다.
// 사용: apps/web에서 개발 서버를 띄운 뒤 `node scripts/verify-dashboard-browser.mjs`
//   TEST_ORIGIN(기본 http://localhost:3100), SHOT_DIR을 주면 1440·768·390px 전체 화면을 그 폴더에 찍는다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const shotDir = process.env.SHOT_DIR;
const axeSource = fs.readFileSync('node_modules/.release-tools/node_modules/axe-core/axe.min.js', 'utf8');
const DAY = 24 * 60 * 60 * 1000;
const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const dateAt = (offset) => new Date(Date.parse(`${todayKst}T00:00:00Z`) + offset * DAY).toISOString().slice(0, 10);

// 예시 지원 50건: 최근 8주에 고르게, 사이트·단계·일정이 섞이게 만든다. 회사 이름은 지어낸 이름이다.
const user = { id: '22222222-2222-4222-8222-222222222222', aud: 'authenticated', role: 'authenticated', email: 'dashboard@example.test', app_metadata: { provider: 'email' }, user_metadata: { terms_version: '2026-10-17', privacy_version: '2026-10-17' }, created_at: '2026-09-01T00:00:00Z' };
const NAMES = ['가람소프트', '나래랩스', '다온시스템', '라온데이터', '마루테크', '바다컴퍼니', '사이웍스', '아라네트웍스', '자람에듀', '차오름', '카라클라우드', '타래', '파랑스튜디오', '하늘정보'];
const PLATFORMS = ['jobkorea', 'saramin', 'jobkorea', 'saramin', 'wanted'];
const STATUSES = ['applied', 'applied', 'rejected', 'applied', 'screening', 'rejected', 'interview', 'canceled', 'applied', 'offer'];
const rows = Array.from({ length: 50 }, (_, index) => {
  const applied = dateAt(-((index * 53) % 56) - (index % 3 === 0 ? 0 : 1));
  const status = STATUSES[index % STATUSES.length];
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    user_id: user.id,
    company: `${NAMES[index % NAMES.length]}${index >= NAMES.length ? ` ${Math.floor(index / NAMES.length) + 1}` : ''}`,
    position: ['프론트엔드 개발자', '백엔드 개발자', '웹 퍼블리셔'][index % 3],
    platform: PLATFORMS[index % PLATFORMS.length],
    status,
    status_source: status === 'rejected' && index % 4 === 0 ? 'deadline' : 'manual',
    applied_at: `${applied}T01:00:00Z`,
    updated_at: `${applied}T01:00:00Z`,
    created_at: `${applied}T01:00:00Z`,
    memo: null,
    diary: [],
    interview_date: status === 'interview' ? `${dateAt(2 + (index % 5))}T05:00:00Z` : null,
    deadline_at: index % 6 === 0 ? dateAt(index % 20) : null,
    url: null,
    external_id: null,
  };
});

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext();
const pageErrors = [];
await context.route('https://*.supabase.co/**', async (route) => {
  const url = new URL(route.request().url());
  const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (url.pathname === '/auth/v1/user') return send(user);
  if (url.pathname === '/rest/v1/applications') return send(rows);
  if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
  throw new Error(`예상하지 않은 요청: ${route.request().method()} ${url.pathname}`);
});
const page = await context.newPage();
page.on('pageerror', (error) => pageErrors.push(error.message));
page.setDefaultTimeout(10000);

async function scan(name) {
  await page.waitForTimeout(700); // 카드가 올라오는 움직임(0.5s + 지연)이 끝난 뒤 잰다
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return result.violations.map((item) => ({ id: item.id, targets: item.nodes.map((node) => node.target) }));
  });
  assert.deepEqual(violations, [], name);
  const missing = await page.evaluate(() => Array.from(document.querySelectorAll('[aria-describedby], [aria-controls], [aria-labelledby]')).flatMap((element) => ['aria-describedby', 'aria-controls', 'aria-labelledby'].flatMap((attribute) => (element.getAttribute(attribute) || '').split(' ').filter(Boolean).filter((id) => !document.getElementById(id)))));
  assert.deepEqual(missing, [], `${name}: ARIA 참조 대상 존재`);
  console.log(`PASS axe/ARIA ${name}`);
}

try {
  // 로그인: OAuth 복귀처럼 주소의 토큰으로 세션을 만든다.
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.test`;
  await page.goto(`${origin}/login#access_token=${token}&refresh_token=test&expires_in=3600&token_type=bearer`);
  await page.waitForURL(`${origin}/`);
  const heading = page.getByRole('heading', { level: 1 });
  await heading.waitFor();
  await page.addScriptTag({ content: axeSource });

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
  await dayButton.click();
  assert.equal(await dayButton.getAttribute('aria-pressed'), 'true');
  const list = page.getByRole('region', { name: /지원 \d+곳$/ });
  await list.waitFor();
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

  // 다가오는 일정: 펼치기
  const more = page.getByRole('button', { name: /^나머지 \d+건 보기$/ });
  if (await more.count()) {
    await more.click();
    await page.getByRole('button', { name: '접기' }).waitFor();
  }

  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px 가로 넘침`);
    if (shotDir) await page.screenshot({ path: path.join(shotDir, `dashboard_${width}.png`), fullPage: true });
  }
  await scan('390px');
  assert.deepEqual(pageErrors, []);
  console.log('PASS 요약 문장·차트 이름·건너뛰기·계정 메뉴 Esc·달력 목록→상세 패널·달 이동·일정 펼치기·3개 너비, 브라우저 예외 0건');
} finally {
  await browser.close();
}
