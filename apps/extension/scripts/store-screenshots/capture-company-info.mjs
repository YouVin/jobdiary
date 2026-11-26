// 스토어 소개 4번(공고 페이지에서 회사 정보)의 원본을 촬영한다 (#253).
// 웹앱 운영 빌드를 예시 데이터(apps/web/scripts/fixtures/sampleSession.mjs)로 띄우고, 익스텐션 응답과 서버는 흉내 낸다.
// 실제 계정·DB·AI·채용 사이트에 요청하지 않는다. 사용: apps/web에서 `npx next start -p 3100`을 띄운 뒤
//   node apps/extension/scripts/store-screenshots/capture-company-info.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const output = path.join(root, 'apps/extension/docs/store-screenshots/raw');
const { routeSupabase, rows, signIn } = await import(pathToFileURL(path.join(root, 'apps/web/scripts/fixtures/sampleSession.mjs')).href);
const playwrightPath = process.env.PLAYWRIGHT_MODULE || path.join(root, 'apps/web/node_modules/.release-tools/node_modules/playwright/index.mjs');
const { chromium } = await import(pathToFileURL(playwrightPath).href);

// 회사 정보는 서류 통과부터 만들 수 있다(#242). 예시 지원을 서류 통과로 두고 잡코리아 공고 주소를 붙인다.
for (const row of rows) {
  if (row.status === 'applied') row.status = 'screening';
  row.url = 'https://www.jobkorea.co.kr/Recruit/GI_Read/900101';
}
const posting = {
  platform: 'jobkorea', postingId: '900101', url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/900101', title: '프론트엔드 개발자', company: '가상회사',
  location: '서울 서초구 동산로 13', workSchedule: '주5일(월~금)',
  text: '[주요업무]\n- React로 사용자 화면을 만들어요\n[자격요건]\n- 다양한 직군의 동료와 원활하게 소통하는 분\n- 맡은 기능을 기획부터 배포까지 책임지고 완수해 본 경험',
  imageUrls: ['https://file2.jobkorea.co.kr/Net/Recruit/example.png'],
};

// 공고 본문 이미지 대신 받기 응답용 흰 PNG
function makePng(width, height) {
  const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (bytes) => { let c = 0xffffffff; for (const byte of bytes) c = table[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([length, body, sum]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height, 0xff); for (let y = 0; y < height; y += 1) raw[y * (width * 3 + 1)] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const browser = await chromium.launch({
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'msedge' }), headless: true,
});
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  // 가짜 익스텐션: 공고 읽기 요청에만 예시 공고로 답한다
  await context.addInitScript((answer) => {
    const runtime = { lastError: undefined, sendMessage(_id, message, callback) {
      setTimeout(() => callback(message?.type === 'JOBDIARY_POSTING_READ' ? { ok: true, posting: answer } : undefined), 30);
    } };
    Object.defineProperty(window, 'chrome', { value: { ...(window.chrome || {}), runtime }, configurable: true });
  }, posting);
  await routeSupabase(context);
  const png = makePng(20, 40);
  await context.route('https://*.supabase.co/functions/v1/posting-image', (route) => route.request().method() === 'OPTIONS'
    ? route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
    : route.fulfill({ status: 200, contentType: 'image/png', body: png, headers: { 'Access-Control-Allow-Origin': '*' } }));
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  await signIn(page, origin, '/board');
  await page.getByRole('heading', { level: 1, name: '지원 보드' }).waitFor();
  await page.getByRole('region', { name: /결과 기다리는 중/ }).getByRole('button', { name: / 상세 보기$/ }).first().click();
  const section = page.getByRole('dialog').getByRole('region', { name: '회사 정보' });
  await section.getByRole('button', { name: '공고 페이지에서 가져오기', exact: true }).click();
  await section.getByRole('status').filter({ hasText: '회사 정보를 만들었어요.' }).waitFor();
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  // 결과 카드만 찍는다(회사 소개 → 강점 → 근무 조건). 알림 줄은 빼고, 카드 안 첫 화면 높이까지만.
  const card = section.locator('div.ring-1').first();
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  assert(box && box.width > 300, '회사 정보 결과 카드');
  fs.mkdirSync(output, { recursive: true });
  await card.screenshot({ path: path.join(output, 'company-info.png') });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ file: 'raw/company-info.png', cssWidth: Math.round(box.width), cssHeight: Math.round(box.height), exampleData: true }));
} finally {
  await browser.close();
}
