// 소개 페이지(/intro, #286, #310)의 실제 화면 사진을 예시 데이터(fixture, 지어낸 회사 이름)로 다시 찍는다.
// 사용: apps/web에서 `npx next start -p 3100` 뒤 `node scripts/capture-intro-screens.mjs`
// 결과: public/intro/*-{EDITION}.png 와 각 크기(constants/intro.ts의 src·width·height에 맞춘다)
//  - hero-desktop·hero-mobile: 첫 화면 맥북·아이폰 속 실제 홈
//  - home·board·detail·recap: 할 수 있는 것 4줄(PC), home-mobile·board-mobile·recap-mobile: 휴대폰에서 보여줄 사진
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { companyInfoStore, monthlyNotes, routeSupabase, rows, SAMPLE_COMPANY_INFO, signIn, todayKst, user } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const outDir = process.env.OUT_DIR || path.resolve('public/intro');
fs.mkdirSync(outDir, { recursive: true });
const DAY = 24 * 60 * 60 * 1000;
// 사진 이름 끝에 붙는 판. 다시 찍으면 올린다(같은 이름이면 next/image·Vercel 이미지 캐시가 옛 사진을 보여준다).
// constants/intro.ts의 src도 같은 이름으로 바꾼다.
const EDITION = 'v3'; // v3: #325 문구 정리, #326 돌아보기를 앱 안 월간 화면으로

// PNG 머리(IHDR)에서 가로·세로를 읽는다
function pngSize(file) {
  const buffer = fs.readFileSync(file);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

// ── 예시 데이터: 진행 중 지원마다 공고 전형 절차(#295) ──
const plan = (pairs, source = 'text') => ({ steps: pairs.map(([name, kind]) => ({ name, kind })), source, checkedAt: new Date(Date.now() - DAY).toISOString() });
const PLANS = [
  plan([['서류전형', 'document'], ['코딩테스트', 'test'], ['1차 면접', 'interview'], ['2차 면접', 'interview'], ['최종 합격', 'final']]),
  plan([['서류', 'document'], ['사전 과제', 'test'], ['1차 인터뷰', 'interview'], ['컬처핏 인터뷰', 'interview'], ['처우 협의', 'final']], 'ai'),
  plan([['서류전형', 'document'], ['인적성검사', 'test'], ['면접', 'interview'], ['최종합격', 'final']]),
  plan([['서류', 'document'], ['코딩테스트', 'test'], ['기술 면접', 'interview'], ['임원 면접', 'interview'], ['최종 합격', 'final']], 'ai'),
  plan([['서류', 'document'], ['면접', 'interview'], ['최종 합격', 'final']]),
];
// 서류 통과 지원은 테스트·과제 단계가 있는 절차로(휴대폰 보드 사진에서 진행이 보이게)
rows.forEach((row, index) => {
  if (row.status === 'screening') row.hiring_process = PLANS[index % 4];
  else if (['applied', 'interview', 'interviewed'].includes(row.status)) row.hiring_process = PLANS[index % PLANS.length];
});

// 상세 사진: 1차 면접을 보고 후기를 남긴 뒤 2차 면접을 앞둔 지원
const target = rows.find((row) => row.status === 'interview' && row.status_history?.length >= 3);
target.hiring_process = { ...PLANS[0], step: 3 };
// 공고 주소와 이미 정리된 회사 정보(공고가 원하는 강점)
target.url = 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=51234567';
companyInfoStore.set(target.id, { result: SAMPLE_COMPANY_INFO, created_at: new Date(Date.now() - 20 * DAY).toISOString() });
const interviewMarkedAt = Date.parse(target.status_history[2].at);
target.diary = [
  { id: 'intro-test', content: '코딩테스트 2문제 중 2문제 풀이. 문자열 처리에서 시간을 많이 썼다.', createdAt: new Date(interviewMarkedAt - 3 * DAY).toISOString(), status: 'screening' },
  { id: 'intro-review', content: '받은 질문\n- 최근에 만든 화면에서 가장 신경 쓴 부분은?\n\n내 답\n- 접근성 검사를 넣고 키보드로 다 써지게 만든 것\n\n아쉬운 점\n- 숫자로 성과를 말하지 못했다', createdAt: new Date(interviewMarkedAt + 4 * DAY + 2 * 60 * 60 * 1000).toISOString(), status: 'interview' },
];

// 돌아보기 사진: 이번 달에 남긴 기록이 몇 개 있게(예시 카드에 "남긴 기록 0개"가 보이지 않게)
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
const recordDays = [2, 5, 9, 14, 18, 21, 24];
rows.filter((row) => row !== target && row.status !== 'canceled').slice(0, recordDays.length).forEach((row, index) => {
  const at = Math.min(monthStart + recordDays[index] * DAY + 10 * 60 * 60 * 1000, Date.now() - 60 * 60 * 1000);
  row.diary = [...(row.diary ?? []), { id: `intro-month-${index}`, content: '오늘 지원한 이유를 짧게 남겼다.', createdAt: new Date(at).toISOString(), status: row.status }];
});

// 돌아보기 사진의 이번 달 한 줄(#316)
monthlyNotes.set(todayKst.slice(0, 7), '서류 통과가 처음으로 여덟 곳, 면접 준비에 집중한 달');

const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'msedge' }), headless: true });
async function newPage(viewport, deviceScaleFactor) {
  const context = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul', viewport, deviceScaleFactor, reducedMotion: 'reduce' });
  await routeSupabase(context);
  // 사진용 예시: 오늘 아침 가져오기를 한 사람
  await context.addInitScript((userId) => localStorage.setItem(`jobdiary:lastImportAt:${userId}`, new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()), user.id);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  return { context, page };
}
const fileOf = (name) => path.join(outDir, `${name}-${EDITION}.png`);
const shot = (page, name, clip) => page.screenshot({ path: fileOf(name), ...(clip ? { clip } : {}) });

try {
  // ── 첫 화면 맥북 속 홈(화면 비율 약 1.57:1) ──
  {
    const { context, page } = await newPage({ width: 1280, height: 816 }, 1.5);
    await signIn(page, origin, '/');
    await page.getByRole('region', { name: '지금까지 지나온 단계' }).waitFor();
    await page.waitForTimeout(600);
    await shot(page, 'hero-desktop');
    await context.close();
  }

  // ── 첫 화면 아이폰 속 홈, 휴대폰용 홈·보드 ──
  {
    const { context, page } = await newPage({ width: 390, height: 830 }, 2);
    await signIn(page, origin, '/');
    const journey = page.locator('[aria-labelledby="journey-title"]').first();
    await journey.waitFor();
    await page.waitForTimeout(600);
    await shot(page, 'hero-mobile');
    // 휴대폰용 홈: 요약 카드부터 전형 여정 카드까지
    const main = await page.locator('main').boundingBox();
    const journeyBox = await journey.boundingBox();
    await page.setViewportSize({ width: 390, height: Math.ceil(journeyBox.y + journeyBox.height + 24) });
    await page.waitForTimeout(300);
    await shot(page, 'home-mobile', { x: 0, y: main.y, width: 390, height: journeyBox.y + journeyBox.height - main.y + 8 });
    // 휴대폰용 보드: 주간 보기의 결과 기다리는 중에서 서류 통과만(지원마다 자기 전형 단계와 진행)
    await page.setViewportSize({ width: 390, height: 830 });
    await page.goto(`${origin}/board`);
    const waiting = page.locator('[aria-labelledby="waiting-title"]');
    await waiting.waitFor();
    await page.getByRole('group', { name: '단계별 보기' }).getByRole('button', { name: /^서류 통과/ }).click();
    await waiting.getByText('서류 통과만').waitFor();
    await page.waitForTimeout(500);
    const rowsInList = waiting.locator('li');
    const waitingBox = await waiting.boundingBox();
    const fourth = await rowsInList.nth(3).boundingBox();
    await page.setViewportSize({ width: 390, height: Math.ceil(fourth.y + fourth.height + 40) });
    await page.waitForTimeout(300);
    await shot(page, 'board-mobile', { x: 0, y: waitingBox.y - 8, width: 390, height: fourth.y + fourth.height - waitingBox.y + 16 });
    // 휴대폰용 돌아보기(#326): 창 위쪽 요약부터 지난달과 비교한 숫자 칸까지
    await page.setViewportSize({ width: 390, height: 2400 });
    await page.goto(`${origin}/`);
    await page.getByRole('button', { name: /월 돌아보기$/ }).click();
    const recapSheet = page.getByRole('dialog');
    await recapSheet.waitFor();
    await page.waitForTimeout(800);
    const sheetBox = await recapSheet.boundingBox();
    const statsBox = await recapSheet.locator('dl').first().boundingBox();
    await shot(page, 'recap-mobile', { x: 0, y: sheetBox.y, width: 390, height: statsBox.y + statsBox.height - sheetBox.y + 24 });
    await context.close();
  }

  // ── 할 수 있는 것 4줄(PC) ──
  {
    const { context, page } = await newPage({ width: 1200, height: 1400 }, 2);
    // 홈: 요약 카드부터 전형 여정 줄까지
    await signIn(page, origin, '/');
    await page.getByRole('region', { name: '지금까지 지나온 단계' }).waitFor();
    await page.waitForTimeout(400);
    const top = await page.locator('main').boundingBox();
    const journeyCard = await page.locator('[aria-labelledby="journey-title"]').first().boundingBox();
    await shot(page, 'home', { x: top.x, y: top.y, width: top.width, height: journeyCard.y + journeyCard.height - top.y + 8 });

    // 이번 달 돌아보기(#326): 앱 안 월간 화면(창) 그대로. 예전에는 공유 이미지를 저장했다(#317 전)
    await page.getByRole('button', { name: /월 돌아보기$/ }).click();
    const recapDialog = page.getByRole('dialog');
    await recapDialog.waitFor();
    await page.waitForTimeout(800);
    await recapDialog.screenshot({ path: fileOf('recap') });
    await page.keyboard.press('Escape');

    // 지원 보드: 칸반 보기 위쪽(카드마다 회사별 지금 단계)
    await page.goto(`${origin}/board`);
    await page.getByRole('group', { name: '보기 선택' }).getByRole('button', { name: '보드', exact: true }).click();
    await page.waitForTimeout(500);
    const board = await page.locator('main').boundingBox();
    await shot(page, 'board', { x: board.x, y: board.y, width: board.width, height: 760 });

    // 지원 상세: 2차 면접을 앞둔 지원의 패널(회사별 전형 절차·면접 후기·지나온 기록)
    // 패널은 화면 높이 안에서 스크롤되므로, 끝까지 한 장에 담게 창을 길게 늘린다
    await page.setViewportSize({ width: 1200, height: 2600 });
    await page.getByRole('button', { name: `${target.company}, ${target.position}, 면접 예정`, exact: true }).click();
    const panel = page.getByRole('dialog', { name: target.company });
    await panel.getByRole('region', { name: '지나온 기록' }).waitFor();
    await page.waitForTimeout(500);
    const panelBox = await panel.boundingBox();
    const listBox = await panel.getByRole('region', { name: '지나온 기록' }).boundingBox();
    await shot(page, 'detail', { x: panelBox.x, y: panelBox.y, width: panelBox.width, height: listBox.y + listBox.height - panelBox.y + 32 });
    await context.close();
  }

  for (const name of ['hero-desktop', 'hero-mobile', 'home', 'home-mobile', 'board', 'board-mobile', 'detail', 'recap', 'recap-mobile']) console.log(`${name}-${EDITION}`, JSON.stringify(pngSize(fileOf(name))));
} finally {
  await browser.close();
}
