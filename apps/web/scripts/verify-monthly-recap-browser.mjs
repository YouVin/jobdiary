// 이번 달 돌아보기(#275, #316)를 운영 빌드에서 검사한다. 예시 지원 50건 fixture.
// 사용: apps/web에서 `npx next start -p 3100` 뒤 `node scripts/verify-monthly-recap-browser.mjs` (SHOT_DIR을 주면 창을 찍는다)
import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { monthlyNotes, monthlyNoteWrites, routeSupabase, scan, signIn } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const shotDir = process.env.SHOT_DIR;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const monthKey = today.slice(0, 7);
const month = Number(today.slice(5, 7));
const previousMonth = month === 1 ? 12 : month - 1;
const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'msedge' }), headless: true });
const errors = [];
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul', viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await routeSupabase(context);
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.setDefaultTimeout(15000);
    await signIn(page, origin);

    // ── 홈 요약 카드의 버튼 → 창: 제목·한 문장 요약·달력·숫자·소식 ──
    const open = page.getByRole('button', { name: `${month}월 돌아보기` });
    await open.click();
    const dialog = page.getByRole('dialog', { name: `${month}월 돌아보기` });
    await dialog.getByText(/^이번 달 /).first().waitFor();
    const calendar = dialog.getByRole('group', { name: `${month}월 날짜별 지원과 소식` });
    const appliedDays = calendar.getByRole('button', { name: /지원 \d+곳/ });
    assert.ok((await appliedDays.count()) > 0, '지원한 날은 누를 수 있다');
    await dialog.getByText(`${previousMonth}월 `, { exact: false }).first().waitFor(); // 지난 달 비교
    const events = dialog.getByRole('region', { name: `${month}월 소식` });
    const rows = events.getByRole('listitem');
    assert.ok((await rows.count()) >= 1 && (await rows.count()) <= 5, '처음에는 최근 소식 5개까지');
    await scan(page, `이번 달 돌아보기 ${width}px`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 0, `${width}px 가로 넘침`);
    if (shotDir) await dialog.screenshot({ path: path.join(shotDir, `monthly-recap-${width}.png`) });

    // ── 날짜를 누르면 그날 소식만, 다시 누르거나 전체 보기로 돌아온다 ──
    const firstDay = appliedDays.first();
    const dayNumber = Number((await firstDay.getAttribute('aria-label')).match(/(\d+)일/)[1]);
    await firstDay.click();
    const dayEvents = dialog.getByRole('region', { name: `${month}월 ${dayNumber}일 소식` });
    await dayEvents.waitFor();
    for (const row of await dayEvents.getByRole('listitem').all()) assert.match(await row.textContent(), new RegExp(`^${month}\\.${dayNumber}`));
    await dialog.getByRole('button', { name: '전체 보기' }).click();
    await events.waitFor();

    if (width === 1280) {
      // ── 이번 달 한 줄: 칸을 벗어나면 이 달에 저장 ──
      const note = dialog.getByRole('textbox', { name: '이번 달 한 줄' });
      await note.fill('검증으로 남긴 한 줄');
      await note.press('Tab');
      await dialog.getByText('저장했어요').waitFor();
      assert.deepEqual(monthlyNoteWrites.at(-1), { month: monthKey, note: '검증으로 남긴 한 줄' });

      // ── 지난 달로 넘기기: 그 달 제목·빈 한 줄 → 이번 달로 돌아오면 한 줄이 다시 보인다 ──
      await dialog.getByRole('button', { name: `${previousMonth}월 보기` }).click();
      const previousDialog = page.getByRole('dialog', { name: new RegExp(`${previousMonth}월 돌아보기$`) });
      await previousDialog.getByRole('textbox', { name: new RegExp(`${previousMonth}월 한 줄$`) }).waitFor();
      assert.equal(await previousDialog.getByRole('button', { name: '다음 달 보기' }).isDisabled(), false);
      await previousDialog.getByRole('button', { name: '이번 달', exact: true }).click();
      await dialog.waitFor();
      assert.equal(await dialog.getByRole('textbox', { name: '이번 달 한 줄' }).inputValue(), '검증으로 남긴 한 줄');
      assert.equal(await dialog.getByRole('button', { name: '다음 달 보기' }).isDisabled(), true, '이번 달 다음은 없다');
      assert.equal(monthlyNotes.get(monthKey), '검증으로 남긴 한 줄');

      // ── 공유 이미지는 보조 버튼으로: 1080×1350 PNG 저장 링크 ──
      const save = dialog.getByRole('link', { name: '이미지로 저장' });
      await save.waitFor();
      assert.match(await save.getAttribute('download'), /^취준일기-\d{4}-\d{2}\.png$/);
      const size = await save.evaluate(async (element) => {
        const blob = await (await fetch(element.href)).blob();
        const bitmap = await createImageBitmap(blob);
        return [bitmap.width, bitmap.height];
      });
      assert.deepEqual(size, [1080, 1350]);
    }

    // ── Esc로 닫으면 버튼으로 포커스가 돌아온다 ──
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await open.evaluate((element) => element === document.activeElement), true);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS 이번 달 돌아보기: 요약·달력·지난 달 비교·최근 소식 5개·날짜별 소식·한 줄 저장·지난 달 넘기기·이미지 저장(1080×1350)·axe·1280/390px 넘침 없음·Esc 포커스 복귀, 브라우저 예외 0건');
} finally {
  await browser.close();
}
