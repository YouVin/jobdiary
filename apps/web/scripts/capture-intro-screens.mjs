// 소개 페이지(/intro, #286)의 실제 화면 4장을 예시 데이터(fixture, 지어낸 회사 이름)로 다시 찍는다.
// 사용: apps/web에서 `npx next start -p 3100` 뒤 `node scripts/capture-intro-screens.mjs`
// 결과: public/intro/{home,board,detail,recap}.png 와 각 크기(constants/intro.ts의 width·height에 맞춘다)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { routeSupabase, rows, signIn, user } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const outDir = process.env.OUT_DIR || path.resolve('public/intro');
fs.mkdirSync(outDir, { recursive: true });

// PNG 머리(IHDR)에서 가로·세로를 읽는다
function pngSize(file) {
  const buffer = fs.readFileSync(file);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'msedge' }), headless: true });
try {
  const context = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul', viewport: { width: 1200, height: 1400 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  await routeSupabase(context);
  // 사진용 예시: 오늘 아침 가져오기를 한 사람, 상세 패널 지원에는 면접 후기와 탈락 뒤 한 줄
  await context.addInitScript((userId) => localStorage.setItem(`jobdiary:lastImportAt:${userId}`, new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()), user.id);
  const target = rows[5];
  const [interviewAt, rejectedAt] = [target.status_history[2].at, target.status_history[3].at];
  target.diary = [
    { id: 'intro-review', content: '받은 질문\n- 최근에 만든 화면에서 가장 신경 쓴 부분은?\n\n내 답\n- 접근성 검사를 넣고 키보드로 다 써지게 만든 것\n\n아쉬운 점\n- 숫자로 성과를 말하지 못했다', createdAt: new Date(Date.parse(interviewAt) + 2 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(), status: 'interviewed' },
    { id: 'intro-next', content: '다음 면접에서는 성과를 숫자로 먼저 말하기', createdAt: new Date(Date.parse(rejectedAt) + 3 * 60 * 60 * 1000).toISOString(), status: 'rejected' },
  ];
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  // ── 홈: 요약 카드부터 전형 여정 줄까지 ──
  await signIn(page, origin, '/');
  const journey = page.getByRole('region', { name: '지금까지 지나온 단계' });
  await journey.waitFor();
  const top = await page.locator('main').boundingBox();
  const journeyCard = await page.locator('[aria-labelledby="journey-title"]').first().boundingBox();
  await page.screenshot({ path: path.join(outDir, 'home.png'), clip: { x: top.x, y: top.y, width: top.width, height: journeyCard.y + journeyCard.height - top.y + 8 } });

  // ── 이번 달 돌아보기: 만들어진 이미지 그대로 ──
  await page.getByRole('button', { name: /월 돌아보기$/ }).click();
  const preview = page.getByRole('dialog').getByRole('img').first();
  await preview.waitFor();
  const dataUrl = await preview.evaluate(async (image) => {
    const blob = await (await fetch(image.src)).blob();
    return await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
  });
  fs.writeFileSync(path.join(outDir, 'recap.png'), Buffer.from(dataUrl.split(',')[1], 'base64'));
  await page.keyboard.press('Escape');

  // ── 지원 보드: 칸반 보기 위쪽 ──
  await page.goto(`${origin}/board`);
  await page.getByRole('group', { name: '보기 선택' }).getByRole('button', { name: '보드', exact: true }).click();
  await page.waitForTimeout(500);
  const board = await page.locator('main').boundingBox();
  await page.screenshot({ path: path.join(outDir, 'board.png'), clip: { x: board.x, y: board.y, width: board.width, height: 760 } });

  // ── 지원 상세: 면접까지 갔다가 탈락한 지원의 패널 ──
  await page.getByRole('button', { name: `${target.company}, ${target.position}, 면접 후 탈락`, exact: true }).click();
  const panel = page.getByRole('dialog', { name: target.company });
  await panel.getByRole('region', { name: '지나온 기록' }).waitFor();
  await page.waitForTimeout(500);
  // 패널 위에서 지나온 기록 끝까지만 (아래 빈 곳 빼기)
  const panelBox = await panel.boundingBox();
  const listBox = await panel.getByRole('region', { name: '지나온 기록' }).boundingBox();
  await page.screenshot({ path: path.join(outDir, 'detail.png'), clip: { x: panelBox.x, y: panelBox.y, width: panelBox.width, height: listBox.y + listBox.height - panelBox.y + 32 } });

  for (const name of ['home', 'board', 'detail', 'recap']) console.log(name, JSON.stringify(pngSize(path.join(outDir, `${name}.png`))));
} finally {
  await browser.close();
}
