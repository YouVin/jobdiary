// 지원 상세 "회사 정보" (#229, 공고 페이지에서 가져오기만 #242)를 실제 Edge·앱으로 검사한다. Supabase·Edge Function은 fixture로 대신하고 실제 AI는 부르지 않는다.
// 사용: apps/web에서 서버를 띄운 뒤 `node scripts/verify-company-info-browser.mjs`
//   TEST_ORIGIN(기본 http://localhost:3100), SHOT_DIR을 주면 빈 상태·결과를 1440·390px로 찍는다.
import assert from 'node:assert/strict';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { companyInfoRequests, companyInfoStore, routeSupabase, rows, scan as scanPage, signIn } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const shotDir = process.env.SHOT_DIR;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
// 공고 페이지에서 가져오기(#238)를 보려고 모든 예시 지원에 잡코리아 공고 주소를 둔다.
// 회사 정보는 서류 통과부터 만들 수 있어(#242) 지원 완료 예시를 서류 통과로 올린다.
const raisedRows = rows.filter((row) => row.status === 'applied');
for (const row of raisedRows) row.status = 'screening';
for (const row of rows) row.url = 'https://www.jobkorea.co.kr/Recruit/GI_Read/50303737';
// 전형 절차 자동 채우기(#295)는 따로 검사한다(verify-hiring-process-browser). 여기서는 이미 읽은 것으로 두어 공고 읽기가 섞이지 않게 한다
for (const row of rows) row.hiring_process = { steps: [], source: 'none', checkedAt: '2026-11-27T00:00:00.000Z' };
// 가짜 익스텐션: 공고 읽기 요청에만 답한다(다른 요청은 모르는 것처럼). window.__noExtension이면 설치 안 된 것처럼.
const PAGE_POSTING = {
  platform: 'jobkorea', postingId: '50303737', url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/50303737', title: '파이프라인 엔지니어', company: '엔코어스튜디오',
  location: '서울 강남구 도산대로56길 5 (청담동) 지하1층,1층', workSchedule: '주5일(월~금)',
  text: '[주요업무]\n- 생성형 AI 제작 파이프라인 개발\n[자격요건]\n- 새로운 기술을 직접 시도하고 만들어 가는 분\n- 다양한 팀과 협업해 본 경험이 있는 분', imageUrls: ['https://file2.jobkorea.co.kr/Net/Recruit/posting.png'],
};
await context.addInitScript((posting) => {
  const runtime = { lastError: undefined, sendMessage(_id, message, callback) {
    setTimeout(() => {
      if (window.__noExtension || message?.type !== 'JOBDIARY_POSTING_READ') { runtime.lastError = { message: 'no receiver' }; callback(undefined); runtime.lastError = undefined; return; }
      callback({ ok: true, posting: { ...posting, text: posting.text + (window.__postingSuffix || '') } });
    }, 30);
  } };
  Object.defineProperty(window, 'chrome', { value: { ...(window.chrome || {}), runtime }, configurable: true });
  Object.defineProperty(window, '__noExtension', { value: false, writable: true, configurable: true });
  Object.defineProperty(window, '__postingSuffix', { value: '', writable: true, configurable: true });
}, PAGE_POSTING);
await routeSupabase(context); // 나중에 등록한 라우트가 먼저 잡으므로 공통 fixture를 먼저 둔다
// 서버 이미지 대신 받기: 작은 PNG를 돌려준다
const postingImageRequests = [];
// 올바른 흰색 PNG(가로 20 × 세로 40)를 직접 만든다. 손으로 적은 base64는 깨져 있어 이미지 읽기에서 실패했다.
function makePng(width, height) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (bytes) => { let c = 0xffffffff; for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([length, body, sum]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height, 0xff); for (let y = 0; y < height; y += 1) raw[y * (width * 3 + 1)] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const TINY_PNG = makePng(20, 40);
await context.route('https://*.supabase.co/functions/v1/posting-image', async (route) => {
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
  postingImageRequests.push(route.request().postDataJSON().url);
  return route.fulfill({ status: 200, contentType: 'image/png', body: TINY_PNG, headers: { 'Access-Control-Allow-Origin': '*' } });
});
const page = await context.newPage();
page.on('pageerror', (error) => pageErrors.push(error.message));
page.setDefaultTimeout(10000);
const scan = (name) => scanPage(page, name);

async function shoot(name, panel) {
  if (!shotDir) return;
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(400);
    await panel.screenshot({ path: path.join(shotDir, `company_${name}_${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function openPanel(index = 0) {
  const openButton = page.getByRole('region', { name: /결과 기다리는 중/ }).getByRole('button', { name: / 상세 보기$/ }).nth(index);
  const companyName = (await openButton.getAttribute('aria-label')).replace(/ 상세 보기$/, '');
  await openButton.click();
  const panel = page.getByRole('dialog', { name: companyName });
  await panel.waitFor();
  return panel;
}

try {
  await signIn(page, origin, '/board');
  await page.getByRole('heading', { level: 1, name: '지원 보드' }).waitFor();

  // 1) 빈 상태: 공고 페이지에서 가져오기만 있다(#242). 캡처·파일·글 붙여넣기 입력은 없다
  let panel = await openPanel();
  let section = panel.getByRole('region', { name: '회사 정보' });
  await section.getByRole('group', { name: '회사 정보 만들기' }).waitFor();
  const pageButton = () => section.getByRole('button', { name: '공고 페이지에서 가져오기', exact: true });
  await pageButton().waitFor();
  await section.getByText('잡코리아 공고를 읽고 회사 소개, 원하는 강점, 근무 조건을 정리해요.').waitFor();
  await section.getByText('공고 내용만 AI(Anthropic)에 보내요. 하루 5번까지 쓸 수 있어요.').waitFor();
  assert.equal(await section.locator('input[type="file"], textarea').count(), 0, '캡처·글 입력 칸 없음');
  for (const removed of [/공고 이미지 넣기/, /글로 붙여넣기/]) assert.equal(await section.getByRole('button', { name: removed }).count(), 0, `${removed} 버튼 없음`);
  await scan('회사 정보·빈 상태');
  await shoot('empty', panel);
  console.log('PASS 빈 상태: 공고 페이지에서 가져오기만(캡처·글 입력 없음)');

  // 2) 익스텐션이 예전 버전이라 이 요청을 모르면(응답 없음) 업데이트 안내, 서버 요청 없음
  await page.evaluate(() => { window.__noExtension = true; });
  await pageButton().click();
  await section.getByRole('alert').filter({ hasText: '익스텐션을 최신 버전으로 업데이트하면' }).waitFor();
  assert.equal(companyInfoRequests.length, 0);
  assert.equal(await section.getByText(/캡처/).count(), 0, '캡처를 권하지 않는다');
  await page.evaluate(() => { window.__noExtension = false; });
  console.log('PASS 예전 익스텐션 업데이트 안내(서버 요청 0건)');

  // 3) 가져오기 → 공고 페이지 입력(글·근무지·이미지 조각)으로 보내고 결과(#235 형식)를 보여 준다
  await pageButton().click();
  await section.getByRole('status').filter({ hasText: '회사 정보를 만들었어요.' }).waitFor();
  assert.equal(companyInfoRequests.length, 1);
  const pageRequest = companyInfoRequests[0];
  assert.deepEqual(Object.keys(pageRequest).sort(), ['applicationId', 'postingPage', 'regenerate']);
  assert.equal(pageRequest.regenerate, false);
  assert.deepEqual([pageRequest.postingPage.location, pageRequest.postingPage.workSchedule, pageRequest.postingPage.text.startsWith('[주요업무]')], ['서울 강남구 도산대로56길 5 (청담동) 지하1층,1층', '주5일(월~금)', true]);
  assert.ok(pageRequest.postingPage.images.length >= 1 && pageRequest.postingPage.images.every((piece) => piece.mediaType === 'image/jpeg'), '잡코리아 이미지를 대신 받아 잘라 보냄');
  assert.deepEqual(postingImageRequests, ['https://file2.jobkorea.co.kr/Net/Recruit/posting.png'], '서버 대신 받기는 허용된 이미지 주소 1개만');
  await section.getByRole('heading', { name: '이 회사는' }).waitFor();
  await section.getByText('웹 서비스를 만드는 IT 회사예요.').waitFor();
  assert.equal(await section.getByRole('link', { name: /대표 사이트/ }).getAttribute('href'), 'https://www.rootlabs.example/');
  assert.deepEqual(await section.locator('ul > li > p:first-child').allTextContents(), ['소통 능력', '책임감']);
  await section.getByText('이런 경험을 넣으면 좋아요').first().waitFor();
  assert.equal(await section.getByText('다양한 직군의 동료와 원활하게 소통하는 분').isVisible(), false, '근거는 접혀 있다');
  await section.locator('summary').first().focus();
  await page.keyboard.press('Enter');
  await section.getByText('다양한 직군의 동료와 원활하게 소통하는 분').waitFor();
  const map = section.getByRole('link', { name: /서울 서초구 동산로 13/ });
  assert.equal(await map.getAttribute('href'), `https://map.naver.com/p/search/${encodeURIComponent('서울 서초구 동산로 13')}`);
  await section.getByText('주 5일(월~금)').waitFor();
  await section.getByText('10:00~19:00').waitFor();
  await scan('회사 정보·결과(근거 펼침)');
  await shoot('result', panel);
  console.log('PASS 공고 페이지에서 가져오기 → 공고 페이지 입력 전송·이미지 대신 받기·결과(회사 소개·강점·근거·근무 조건)');

  // 4) 다시 만들기: 한도 초과는 서버 문구, 취소하면 결과로
  await section.getByRole('button', { name: '다시 만들기', exact: true }).click();
  await section.getByRole('group', { name: '회사 정보 다시 만들기' }).waitFor();
  await page.evaluate(() => { window.__postingSuffix = '\n[한도초과]'; });
  await pageButton().click();
  await section.getByRole('alert').filter({ hasText: '회사 정보는 하루 5번까지 새로 만들 수 있어요. 내일 다시 해 주세요.' }).waitFor();
  assert.equal(companyInfoRequests[1].regenerate, true);
  await page.evaluate(() => { window.__postingSuffix = ''; });
  await scan('회사 정보·다시 만들기 한도 초과');
  await section.getByRole('button', { name: '취소', exact: true }).click();
  await section.getByText('웹 서비스를 만드는 IT 회사예요.').waitFor();
  console.log('PASS 다시 만들기 한도 초과 안내·취소');

  // 5) 패널을 닫았다 다시 열면 저장된 결과를 불러온다(요청 추가 없음)
  await panel.getByRole('button', { name: '닫기', exact: true }).click();
  await panel.waitFor({ state: 'detached' });
  const before = companyInfoRequests.length;
  panel = await openPanel();
  section = panel.getByRole('region', { name: '회사 정보' });
  await section.getByText('웹 서비스를 만드는 IT 회사예요.').waitFor();
  assert.equal(companyInfoRequests.length, before);
  console.log('PASS 다시 열면 저장된 결과 불러오기(만들기 요청 0건)');

  // 5-1) 설명(원하는 모습·경험)이 빈 예전 결과: 접힌 버튼만 남지 않게 근거를 펼쳐 보여 준다(#322)
  for (const stored of companyInfoStore.values()) {
    stored.result = { ...stored.result, strengths: [{ strength: '책임감', quote: '맡은 기능을 끝까지 책임지는 분', wants: '', experiences: [] }, ...stored.result.strengths.slice(0, 1)] };
  }
  await panel.getByRole('button', { name: '닫기', exact: true }).click();
  await panel.waitFor({ state: 'detached' });
  panel = await openPanel();
  section = panel.getByRole('region', { name: '회사 정보' });
  await section.getByText('맡은 기능을 끝까지 책임지는 분').waitFor();
  assert.equal(await section.getByText('공고 근거 보기').count(), 1, '설명이 있는 강점만 근거를 접는다');
  await scan('회사 정보·설명 없는 예전 결과');
  console.log('PASS 설명이 빈 예전 강점은 근거를 펼쳐 보여 주기');

  // 6) 공고 주소가 없으면 가져오기 버튼 대신 주소를 넣으라고 안내한다(취소로 결과에 돌아갈 수 있다)
  for (const row of rows) row.url = null;
  await page.reload();
  await page.getByRole('heading', { level: 1, name: '지원 보드' }).waitFor();
  panel = await openPanel();
  section = panel.getByRole('region', { name: '회사 정보' });
  await section.getByRole('button', { name: '다시 만들기', exact: true }).click();
  await section.getByText(/잡코리아, 사람인, 원티드 공고 주소가 있어야 정리할 수 있어요/).waitFor();
  assert.equal(await pageButton().count(), 0, '주소가 없으면 가져오기 버튼 없음');
  await scan('회사 정보·공고 주소 없음');
  await section.getByRole('button', { name: '취소', exact: true }).click();
  await section.getByText('웹 서비스를 만드는 IT 회사예요.').waitFor();
  console.log('PASS 공고 주소 없음 안내·취소');

  // 6-2) 서류 통과 전(지원 완료): 만든 결과는 보이되 다시 만들기는 없고, 결과가 없으면 서류 통과 후 안내만 (#242)
  await panel.getByRole('button', { name: '닫기', exact: true }).click();
  for (const row of raisedRows) row.status = 'applied';
  await page.reload();
  await page.getByRole('heading', { level: 1, name: '지원 보드' }).waitFor();
  panel = await openPanel();
  section = panel.getByRole('region', { name: '회사 정보' });
  await section.getByText('웹 서비스를 만드는 IT 회사예요.').waitFor();
  assert.equal(await section.getByRole('button', { name: '다시 만들기', exact: true }).count(), 0, '지원 완료에서는 다시 만들기 없음');
  await panel.getByRole('button', { name: '닫기', exact: true }).click();
  panel = await openPanel(1);
  section = panel.getByRole('region', { name: '회사 정보' });
  await section.getByText('서류 통과로 바꾸면 이 회사가 하는 일과 공고가 원하는 강점을 정리할 수 있어요.').waitFor();
  assert.equal(await section.getByRole('group').count(), 0, '지원 완료에서는 만들기 칸 없음');
  await scan('회사 정보·서류 통과 전');
  console.log('PASS 서류 통과 전: 결과는 보이고 다시 만들기 없음, 결과 없으면 안내만');

  // 7) 가로 넘침과 패널 너비(#242: 640px 이상 480px, 1024px 이상 520px)
  const panelWidths = { 1440: 520, 768: 480 };
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    if (panelWidths[width]) assert.equal(Math.round((await panel.boundingBox()).width), panelWidths[width], `${width}px 패널 너비`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px 가로 넘침`);
  }

  assert.deepEqual(pageErrors, []);
  console.log('PASS 회사 정보 공고 페이지에서 가져오기만·서류 통과부터·주소 없음 안내·한도 초과·다시 열기, axe 6상태, 패널 너비 480·520px, 3개 너비 가로 넘침 없음, 브라우저 예외 0건');
} finally {
  await browser.close();
}
