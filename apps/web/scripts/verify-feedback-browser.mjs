// 의견 보내기(#278)를 운영 빌드에서 검사한다. 예시 지원 fixture, 서버 함수는 흉내.
// 사용: apps/web에서 `npx next start -p 3100` 뒤 `node scripts/verify-feedback-browser.mjs`
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { feedbackRequests, routeSupabase, scan, signIn } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'msedge' }), headless: true });
const errors = [];
try {
  const context = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  await routeSupabase(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  await signIn(page, origin, '/board?import=1');
  await page.getByRole('heading', { level: 1, name: '지원 보드' }).waitFor();

  const openDialog = async () => {
    await page.getByRole('button', { name: '내 계정', exact: true }).click();
    await page.getByRole('button', { name: '의견 보내기', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '의견 보내기' });
    await dialog.waitFor();
    return dialog;
  };

  // 빈 글은 보내지 않고 칸 아래 안내
  const dialog = await openDialog();
  await dialog.getByRole('button', { name: '보내기' }).click();
  await dialog.getByText('보낼 내용을 적어 주세요.').waitFor();
  assert.equal(feedbackRequests.length, 0);
  await scan(page, '의견 보내기·빈 글');

  // 하루 한도: 창을 닫지 않고 안내
  await dialog.getByRole('textbox', { name: '의견' }).fill('[한도] 테스트');
  await dialog.getByRole('button', { name: '보내기' }).click();
  await dialog.getByText('오늘은 의견을 충분히 보내셨어요.', { exact: false }).waitFor();

  // 보내기: 글과 화면 경로(쿼리 없음)만 보내고 토스트
  await dialog.getByRole('textbox', { name: '의견' }).fill('원티드 지원이 일부만 들어와요');
  await dialog.getByRole('button', { name: '보내기' }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.getByText('의견을 보냈어요. 고마워요!').waitFor();
  assert.deepEqual(feedbackRequests.at(-1), { message: '원티드 지원이 일부만 들어와요', page: '/board' });
  assert.deepEqual(errors, []);
  console.log('PASS 의견 보내기: 계정 메뉴 → 빈 글 안내·하루 한도 안내·보내기(글·경로만, 쿼리 없음)·토스트·axe, 브라우저 예외 0건');
} finally {
  await browser.close();
}
