// 지원 상세 "회사 정보" (#229)를 실제 Edge·앱으로 검사한다. Supabase·Edge Function은 fixture로 대신하고 실제 AI는 부르지 않는다.
// 사용: apps/web에서 서버를 띄운 뒤 `node scripts/verify-company-info-browser.mjs`
//   TEST_ORIGIN(기본 http://localhost:3100), SHOT_DIR을 주면 빈 상태·결과를 1440·390px로 찍는다.
import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { companyInfoRequests, routeSupabase, scan as scanPage, signIn } from './fixtures/sampleSession.mjs';

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

const POSTING = [
  '[주요 업무]', '- React로 사용자 화면을 만들어요', '- 디자인 시스템 부품을 만들고 관리해요', '',
  '■ 자격 요건', '- TypeScript 실무 경험 2년 이상', '- 다양한 직군의 동료와 원활하게 소통하는 분',
  '- 맡은 기능을 기획부터 배포까지 책임지고 완수해 본 경험', '',
  '[우대 사항]', '- Next.js 서비스 운영 경험', '- 테스트 코드 작성 경험', '- 사용자 데이터를 근거로 화면을 개선해 본 경험',
].join('\n');

async function shoot(name, panel) {
  if (!shotDir) return;
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(400);
    await panel.screenshot({ path: path.join(shotDir, `company_${name}_${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function openPanel() {
  const openButton = page.getByRole('region', { name: /결과 기다리는 중/ }).getByRole('button', { name: / 상세 보기$/ }).first();
  const companyName = (await openButton.getAttribute('aria-label')).replace(/ 상세 보기$/, '');
  await openButton.click();
  const panel = page.getByRole('dialog', { name: companyName });
  await panel.waitFor();
  return panel;
}

try {
  await signIn(page, origin, '/board');
  await page.getByRole('heading', { level: 1, name: '지원 보드' }).waitFor();

  // 1) 빈 상태: 안내·붙여넣기 칸·AI 처리 안내
  let panel = await openPanel();
  const section = panel.getByRole('region', { name: '회사 정보' });
  await section.getByRole('form', { name: '회사 정보 만들기' }).waitFor();
  const field = section.getByLabel('공고 내용', { exact: true });
  await section.getByText('공고 내용만 AI(Anthropic)로 보내 정리해요 · 새로 만들기는 하루 5번').waitFor();
  await scan('회사 정보·빈 상태');
  await shoot('empty', panel);

  // 2) 짧은 공고는 서버에 보내지 않고 칸 아래에서 알린다
  await field.fill('프론트엔드 개발자 모집');
  await section.getByRole('button', { name: '회사 정보 만들기', exact: true }).click();
  await section.getByText(/공고 내용이 너무 짧아요/).waitFor();
  assert.equal(await field.getAttribute('aria-invalid'), 'true');
  assert.equal(companyInfoRequests.length, 0, '짧은 공고는 서버에 보내지 않음');
  console.log('PASS 짧은 공고 안내(서버 요청 0건)');

  // 3) 만들기 → 결과: 한 줄 소개·강점(펼치면 원문 근거·준비할 질문)·기술·기준 시각, 완료 알림
  await field.fill(POSTING);
  await section.getByRole('button', { name: '회사 정보 만들기', exact: true }).click();
  await section.getByRole('status').filter({ hasText: '회사 정보를 만들었어요.' }).waitFor();
  assert.equal(companyInfoRequests.length, 1);
  assert.deepEqual(Object.keys(companyInfoRequests[0]).sort(), ['applicationId', 'postingText', 'regenerate'], '보내는 값은 지원 id·공고·다시 만들기 여부뿐');
  assert.equal(companyInfoRequests[0].regenerate, false);
  await section.getByText('웹 서비스를 만드는 IT 회사예요.').waitFor();
  const strengths = section.getByRole('heading', { name: '이 공고가 원하는 강점' });
  await strengths.waitFor();
  assert.deepEqual(await section.locator('details summary > span:first-child').allTextContents(), ['소통', '책임감']);
  await section.locator('summary').first().focus();
  await page.keyboard.press('Enter');
  await section.getByText('다양한 직군의 동료와 원활하게 소통하는 분').waitFor();
  await section.getByText('다른 직군과 의견이 달랐던 경험을 말해 주세요.').waitFor();
  for (const skill of ['React', 'TypeScript', 'Next.js', '테스트 코드']) await section.getByText(skill, { exact: true }).waitFor();
  await section.getByText(/기준 · AI가 공고를 정리한 내용이라 틀릴 수 있어요\./).waitFor();
  await scan('회사 정보·결과(근거 펼침)');
  await shoot('result', panel);
  console.log('PASS 만들기 → 결과(강점 키보드 펼침·근거·질문·기술·기준 시각·알림)');

  // 4) 다시 만들기 → 한도 초과는 서버 문구를 칸 아래에, 취소하면 결과로 돌아온다
  await section.getByRole('button', { name: '다시 만들기', exact: true }).click();
  await section.getByRole('form', { name: '회사 정보 다시 만들기' }).waitFor();
  await field.fill(`${POSTING}\n[한도초과]`);
  await section.getByRole('button', { name: '다시 만들기', exact: true }).click();
  await section.getByText('회사 정보는 하루 5번까지 새로 만들 수 있어요. 내일 다시 해 주세요.').waitFor();
  assert.equal(companyInfoRequests[1].regenerate, true, '결과가 있을 때는 다시 만들기로 보낸다');
  await scan('회사 정보·한도 초과');
  await section.getByRole('button', { name: '취소', exact: true }).click();
  await section.getByText('웹 서비스를 만드는 IT 회사예요.').waitFor();
  console.log('PASS 다시 만들기·한도 초과 안내·취소');

  // 5) 패널을 닫았다 다시 열면 저장된 결과를 불러온다(요청 추가 없음)
  await panel.getByRole('button', { name: '닫기', exact: true }).click();
  await panel.waitFor({ state: 'detached' });
  const before = companyInfoRequests.length;
  panel = await openPanel();
  await panel.getByRole('region', { name: '회사 정보' }).getByText('웹 서비스를 만드는 IT 회사예요.').waitFor();
  assert.equal(companyInfoRequests.length, before);
  console.log('PASS 다시 열면 저장된 결과 불러오기(만들기 요청 0건)');

  // 6) 가로 넘침
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px 가로 넘침`);
  }

  assert.deepEqual(pageErrors, []);
  console.log('PASS 회사 정보 빈 상태·짧은 공고·만들기·근거 펼침·다시 만들기·한도 초과·다시 열기, axe 3상태, 3개 너비, 브라우저 예외 0건');
} finally {
  await browser.close();
}
