// 면접 후기 틀과 같은 회사 지난 후기(#276)를 운영 빌드에서 검사한다. 예시 지원 2건 fixture.
// 사용: apps/web에서 `npx next start -p 3100` 뒤 `node scripts/verify-interview-review-browser.mjs`
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { routeSupabase, rows, scan, signIn } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const base = rows[0];
// 면접은 오늘(한국 날짜) 밤 11시. "며칠 뒤"로 두면 주말에는 다음 주가 되어 이번 주 일정에 없어 실패했다(2026-11-28 토요일).
const later = `${today}T14:00:00.000Z`;
rows.splice(0, rows.length,
  // 지금 면접 예정인 지원
  { ...base, id: '00000000-0000-4000-8000-000000000101', company: '(주)가람소프트', position: '프론트엔드 개발자', status: 'interview', interview_date: later, applied_at: `${today}T01:00:00Z`, diary: [] },
  // 같은 회사에 예전에 지원해 면접 후기를 남긴 지원
  { ...base, id: '00000000-0000-4000-8000-000000000102', company: '가람소프트', position: '웹 개발자', status: 'rejected', interview_date: null, applied_at: '2026-03-01T01:00:00Z',
    diary: [{ id: 'old-review', content: '받은 질문\n- 협업하다 갈등이 생긴 경험\n\n내 답\n- 회고로 풀었다', createdAt: '2026-03-10T09:00:00.000Z', status: 'interviewed' }] },
);

const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'msedge' }), headless: true });
const errors = [];
try {
  const context = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  await routeSupabase(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  await signIn(page, origin, '/board');
  await page.getByRole('button', { name: /^\(주\)가람소프트 면접/ }).first().click();
  const panel = page.getByRole('dialog', { name: '(주)가람소프트' });

  // 같은 회사 지난 후기: 첫 줄 → 펼치면 전체
  const past = panel.getByRole('region', { name: /이 회사 지난 면접 후기/ });
  await past.waitFor();
  await past.getByText('협업하다 갈등이 생긴 경험', { exact: true }).waitFor();
  await past.locator('summary').click();
  await past.getByText('회고로 풀었다', { exact: false }).waitFor();

  // 후기 틀: 빈 칸에 넣고 첫 줄에 커서 → 이어서 쓰고 저장하면 지나온 기록에 "면접 후기"
  await panel.getByRole('button', { name: '면접 후기 틀' }).click();
  const textarea = panel.getByRole('textbox', { name: '면접 전에 준비할 것은 무엇인가요?' });
  assert.match(await textarea.inputValue(), /^받은 질문\n- \n\n내 답\n- \n\n아쉬운 점\n- $/);
  assert.equal(await textarea.evaluate((element) => element === document.activeElement && element.selectionStart), '받은 질문\n- '.length);
  assert.equal(await panel.getByRole('button', { name: '면접 후기 틀' }).count(), 0, '글이 있으면 틀 버튼은 숨김');
  await page.keyboard.type('지원 동기');
  await scan(page, '면접 후기 틀');
  await panel.getByRole('button', { name: '기록 남기기' }).click();
  await panel.getByText('기록을 남겼어요.').waitFor();
  const journey = panel.getByRole('region', { name: '지나온 기록' });
  await journey.locator('p', { hasText: '면접 후기' }).getByText('면접 예정 때', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS 면접 후기: 같은 회사 지난 후기 펼치기·틀 넣기·커서·저장 뒤 "면접 후기" 표시·axe, 브라우저 예외 0건');
} finally {
  await browser.close();
}
