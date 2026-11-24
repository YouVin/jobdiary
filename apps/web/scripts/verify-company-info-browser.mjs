// 지원 상세 "회사 정보" (#229, 이미지 공고 #232)를 실제 Edge·앱으로 검사한다. Supabase·Edge Function은 fixture로 대신하고 실제 AI는 부르지 않는다.
// 사용: apps/web에서 서버를 띄운 뒤 `node scripts/verify-company-info-browser.mjs`
//   TEST_ORIGIN(기본 http://localhost:3100), SHOT_DIR을 주면 빈 상태·결과를 1440·390px로 찍는다.
import assert from 'node:assert/strict';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { companyInfoRequests, routeSupabase, rows, scan as scanPage, signIn } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const shotDir = process.env.SHOT_DIR;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
// 공고 페이지에서 가져오기(#238)를 보려고 모든 예시 지원에 잡코리아 공고 주소를 둔다.
for (const row of rows) row.url = 'https://www.jobkorea.co.kr/Recruit/GI_Read/50303737';
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
      callback({ ok: true, posting });
    }, 30);
  } };
  Object.defineProperty(window, 'chrome', { value: { ...(window.chrome || {}), runtime }, configurable: true });
  Object.defineProperty(window, '__noExtension', { value: false, writable: true, configurable: true });
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

  // 1) 빈 상태: 이미지 넣기가 기본. 상자·안내(이미지 저장 안 함·하루 5번)
  let panel = await openPanel();
  const section = panel.getByRole('region', { name: '회사 정보' });
  await section.getByRole('form', { name: '회사 정보 만들기' }).waitFor();
  const dropButton = section.getByRole('button', { name: /^공고 이미지 넣기/ });
  await dropButton.waitFor();
  await section.getByText('공고 이미지만 AI(Anthropic)로 보내 정리해요 · 이미지는 저장하지 않아요 · 새로 만들기는 하루 5번').waitFor();
  await scan('회사 정보·빈 상태(이미지)');
  await shoot('empty', panel);

  // 2) 이미지 없이 만들기 → 서버에 보내지 않고 안내
  await section.getByRole('button', { name: '회사 정보 만들기', exact: true }).click();
  await section.getByRole('alert').filter({ hasText: '공고 이미지를 넣어 주세요.' }).waitFor();
  assert.equal(companyInfoRequests.length, 0, '이미지 없이는 서버에 보내지 않음');
  console.log('PASS 이미지 없이 만들기 안내(서버 요청 0건)');

  // 3) 긴 세로 공고 이미지(860×3000) 파일로 넣기 + 캡처 붙여넣기(Ctrl+V) + 하나 빼기
  const tallPng = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 860;
    canvas.height = 3000;
    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, 860, 3000);
    context.fillStyle = 'black';
    context.font = '28px sans-serif';
    for (let y = 60; y < 3000; y += 80) context.fillText(`공고 줄 ${y}`, 40, y);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await section.locator('input[type="file"]').setInputFiles({ name: 'posting.png', mimeType: 'image/png', buffer: Buffer.from(tallPng, 'base64') });
  await section.getByRole('img', { name: '공고 이미지 1' }).waitFor();
  await section.locator('form').evaluate(async (form) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    canvas.getContext('2d').fillRect(0, 0, 400, 300);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const data = new DataTransfer();
    data.items.add(new File([blob], 'capture.png', { type: 'image/png' }));
    form.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await section.getByRole('img', { name: '공고 이미지 2' }).waitFor();
  await section.getByRole('button', { name: '공고 이미지 2 빼기', exact: true }).click();
  await section.getByRole('img', { name: '공고 이미지 2' }).waitFor({ state: 'detached' });
  assert.equal(await section.getByRole('img', { name: /^공고 이미지/ }).count(), 1);
  console.log('PASS 이미지 파일 넣기·캡처 붙여넣기(Ctrl+V)·빼기');

  // 4) 만들기 → 860×3000 이미지가 3조각(JPEG)으로 가고, 결과에 읽은 글 보기가 있다
  await section.getByRole('button', { name: '회사 정보 만들기', exact: true }).click();
  await section.getByRole('status').filter({ hasText: '회사 정보를 만들었어요.' }).waitFor();
  assert.equal(companyInfoRequests.length, 1);
  const sent = companyInfoRequests[0];
  assert.deepEqual(Object.keys(sent).sort(), ['applicationId', 'postingImages', 'regenerate'], '보내는 값은 지원 id·이미지 조각·다시 만들기 여부뿐');
  assert.equal(sent.postingImages.length, 3, '860×3000 → 1,400px씩 겹쳐 3조각');
  for (const piece of sent.postingImages) {
    assert.equal(piece.mediaType, 'image/jpeg');
    assert.match(piece.data, /^[A-Za-z0-9+/]+={0,2}$/);
  }
  assert.equal(sent.regenerate, false);
  // #235 형식: 이 회사는(소개·대표 서비스·대표 사이트) → 강점(원하는 것·넣으면 좋은 경험·근거 접힘) → 근무 조건(네이버 지도)
  await section.getByRole('heading', { name: '이 회사는' }).waitFor();
  await section.getByText('웹 서비스를 만드는 IT 회사예요.').waitFor();
  await section.getByText('루트노트', { exact: true }).waitFor();
  assert.equal(await section.getByRole('link', { name: /대표 사이트/ }).getAttribute('href'), 'https://www.rootlabs.example/');
  assert.deepEqual(await section.locator('ul > li > p:first-child').allTextContents(), ['소통 능력', '책임감']);
  await section.getByText('이런 경험을 넣으면 좋아요').first().waitFor();
  await section.getByText('다른 직군과 의견이 달랐을 때 조율해 결과를 낸 경험').waitFor();
  assert.equal(await section.getByText('다양한 직군의 동료와 원활하게 소통하는 분').isVisible(), false, '근거는 접혀 있다');
  await section.locator('summary').first().focus();
  await page.keyboard.press('Enter');
  await section.getByText('다양한 직군의 동료와 원활하게 소통하는 분').waitFor();
  const map = section.getByRole('link', { name: /서울 서초구 동산로 13/ });
  assert.equal(await map.getAttribute('href'), `https://map.naver.com/p/search/${encodeURIComponent('서울 서초구 동산로 13')}`);
  await section.getByText('주 5일(월~금)').waitFor();
  await section.getByText('10:00~19:00').waitFor();
  await section.getByText(/기준 · 이미지에서 읽은 내용 · AI가 정리한 내용이라 틀릴 수 있어요\./).waitFor();
  assert.equal(await section.getByText('이미지에서 읽은 글 보기').count(), 0, '읽은 글 전체는 보여 주지 않는다');
  for (const removed of ['React', '준비할 질문']) assert.equal(await section.getByText(removed, { exact: true }).count(), 0, `${removed} 없음`);
  await scan('회사 정보·결과(근거 펼침)');
  await shoot('result', panel);
  console.log('PASS 이미지로 만들기 → 3조각 전송·결과(회사 소개·대표 사이트·강점별 추천 경험·근거 펼침·근무지 지도 링크·근무일·시간, 읽은 글·기술 없음)');

  // 5) 다시 만들기: 이미지 칸에 글을 붙여 넣으면 글 붙여넣기로 바뀐다
  await section.getByRole('button', { name: '다시 만들기', exact: true }).click();
  await section.getByRole('form', { name: '회사 정보 다시 만들기' }).evaluate((form) => {
    const data = new DataTransfer();
    data.setData('text/plain', '프론트엔드 개발자 모집');
    form.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  const field = section.getByLabel('공고 내용', { exact: true });
  await field.waitFor();
  assert.equal(await field.inputValue(), '프론트엔드 개발자 모집');
  console.log('PASS 이미지 칸에 글 붙여넣기 → 글 붙여넣기로 전환');

  // 6) 글 경로: 짧은 공고는 칸 아래 안내(요청 없음), 한도 초과는 서버 문구, 취소하면 결과로
  await section.getByRole('button', { name: '다시 만들기', exact: true }).click();
  await section.getByText(/공고 내용이 너무 짧아요/).waitFor();
  assert.equal(await field.getAttribute('aria-invalid'), 'true');
  assert.equal(companyInfoRequests.length, 1, '짧은 공고는 서버에 보내지 않음');
  await field.fill(`${POSTING}\n[한도초과]`);
  await section.getByRole('button', { name: '다시 만들기', exact: true }).click();
  await section.getByText('회사 정보는 하루 5번까지 새로 만들 수 있어요. 내일 다시 해 주세요.').waitFor();
  assert.deepEqual([companyInfoRequests[1].regenerate, typeof companyInfoRequests[1].postingText], [true, 'string']);
  await scan('회사 정보·글 붙여넣기 한도 초과');
  await section.getByRole('button', { name: '취소', exact: true }).click();
  await section.getByText('웹 서비스를 만드는 IT 회사예요.').waitFor();
  console.log('PASS 글 붙여넣기 짧은 공고·한도 초과 안내·취소');

  // 7) 패널을 닫았다 다시 열면 저장된 결과를 불러온다(요청 추가 없음)
  await panel.getByRole('button', { name: '닫기', exact: true }).click();
  await panel.waitFor({ state: 'detached' });
  const before = companyInfoRequests.length;
  panel = await openPanel();
  await panel.getByRole('region', { name: '회사 정보' }).getByText('웹 서비스를 만드는 IT 회사예요.').waitFor();
  assert.equal(companyInfoRequests.length, before);
  console.log('PASS 다시 열면 저장된 결과 불러오기(만들기 요청 0건)');

  // 8) 공고 페이지에서 가져오기 (#238): 익스텐션(가짜)이 공고를 읽어 주면 이미지를 서버로 대신 받아 나누고, 공고 페이지 입력으로 보낸다
  await section.getByRole('button', { name: '다시 만들기', exact: true }).click();
  const pageButton = section.getByRole('button', { name: '공고 페이지에서 가져오기', exact: true });
  await section.getByText(/저장된 잡코리아 공고 페이지를 익스텐션이 읽어 와요/).waitFor();
  // 익스텐션이 예전 버전이라 이 요청을 모르면(응답 없음) 업데이트·캡처 안내
  await page.evaluate(() => { window.__noExtension = true; });
  await pageButton.click();
  await section.getByRole('alert').filter({ hasText: '익스텐션을 최신 버전으로 업데이트하면' }).waitFor();
  await page.evaluate(() => { window.__noExtension = false; });
  const beforePage = companyInfoRequests.length;
  await pageButton.click();
  await section.getByRole('status').filter({ hasText: '회사 정보를 만들었어요.' }).waitFor();
  const pageRequest = companyInfoRequests.at(-1);
  assert.equal(companyInfoRequests.length, beforePage + 1);
  assert.deepEqual(Object.keys(pageRequest).sort(), ['applicationId', 'postingPage', 'regenerate']);
  assert.deepEqual([pageRequest.postingPage.location, pageRequest.postingPage.workSchedule, pageRequest.postingPage.text.startsWith('[주요업무]')], ['서울 강남구 도산대로56길 5 (청담동) 지하1층,1층', '주5일(월~금)', true]);
  assert.ok(pageRequest.postingPage.images.length >= 1 && pageRequest.postingPage.images.every((piece) => piece.mediaType === 'image/jpeg'), '잡코리아 이미지를 대신 받아 잘라 보냄');
  assert.deepEqual(postingImageRequests, ['https://file2.jobkorea.co.kr/Net/Recruit/posting.png'], '서버 대신 받기는 허용된 이미지 주소 1개만');
  await scan('회사 정보·공고 페이지에서 가져오기 결과');
  console.log('PASS 공고 페이지에서 가져오기(예전 익스텐션 업데이트 안내·읽기·이미지 대신 받기·공고 페이지 입력 전송)');

  // 9) 가로 넘침
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px 가로 넘침`);
  }

  assert.deepEqual(pageErrors, []);
  console.log('PASS 회사 정보 이미지 넣기(파일·붙여넣기·빼기·조각 전송)·글 붙여넣기 전환·한도 초과·다시 열기, axe 4상태, 3개 너비, 브라우저 예외 0건');
} finally {
  await browser.close();
}
