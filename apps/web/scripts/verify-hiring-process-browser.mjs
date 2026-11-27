// 공고 전형 절차(#295)를 운영 빌드에서 검사한다. 가짜 익스텐션이 공고를 돌려주고, 서버 AI는 fixture가 예시 절차로 답한다.
// 사용: apps/web에서 `npx next start -p 3100` 뒤 `node scripts/verify-hiring-process-browser.mjs`
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { processRequests, routeSupabase, rows, scan, signIn } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const URL_OF = (id) => `https://www.jobkorea.co.kr/Recruit/GI_Read/${id}`;

// ── 예시 지원 3건만 공고 주소를 둔다: 글로 적힌 절차 / 이미지뿐인 공고 / 마감돼 못 읽는 공고 ──
for (const row of rows) row.url = null;
const [textRow, imageRow, closedRow] = [rows[0], rows[4], rows[8]];
Object.assign(textRow, { url: URL_OF(7001), status: 'applied' });
Object.assign(imageRow, { url: URL_OF(7002), status: 'screening' });
Object.assign(closedRow, { url: URL_OF(7003), status: 'applied' });
const duplicateRow = rows[12]; // 이미지 공고와 같은 공고에 한 번 더 지원
Object.assign(duplicateRow, { url: URL_OF(7002), status: 'applied' });
const POSTINGS = {
  7001: { text: '[자격요건]\n- React 경험\n전형절차\n· 서류전형 > 코딩테스트 > 1차면접 > 최종합격\n· 면접일정은 추후 통보됩니다.', imageUrls: [] },
  7002: { text: '공고 본문은 이미지로 확인해 주세요.', imageUrls: ['https://file2.jobkorea.co.kr/Net/Recruit/process.png'] },
};

function makePng(width, height) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (bytes) => { let c = 0xffffffff; for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([length, body, sum]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height, 0xff); for (let y = 0; y < height; y += 1) raw[y * (width * 3 + 1)] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'msedge' }), headless: true });
const errors = [];
const waitFor = async (check, label) => {
  for (let attempt = 0; attempt < 200 && !check(); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok(check(), label);
};
try {
  const context = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul', viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  // 가짜 익스텐션: 공고 주소의 번호로 공고를 돌려준다. 7003은 마감돼 못 읽는 공고
  await context.addInitScript((postings) => {
    const runtime = { lastError: undefined, sendMessage(_id, message, callback) {
      setTimeout(() => {
        if (message?.type !== 'JOBDIARY_POSTING_READ') { runtime.lastError = { message: 'no receiver' }; callback(undefined); runtime.lastError = undefined; return; }
        const id = String(message.url).split('/').pop();
        const posting = postings[id];
        if (!posting) { callback({ ok: false }); return; }
        callback({ ok: true, posting: { platform: 'jobkorea', postingId: id, url: message.url, title: '프론트엔드 개발자', company: '예시회사', location: '', workSchedule: '', ...posting } });
      }, 20);
    } };
    // Chromium은 window.chrome을 통째로 바꿀 수 없어 runtime만 붙인다
    if (window.chrome) Object.defineProperty(window.chrome, 'runtime', { value: runtime, configurable: true });
    else Object.defineProperty(window, 'chrome', { value: { runtime }, configurable: true });
  }, POSTINGS);
  await routeSupabase(context);
  const png = makePng(20, 40);
  let imageRequests = 0;
  await context.route('https://*.supabase.co/functions/v1/posting-image', (route) => route.request().method() === 'OPTIONS'
    ? route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
    : (imageRequests += 1, route.fulfill({ status: 200, contentType: 'image/png', body: png, headers: { 'Access-Control-Allow-Origin': '*' } })));
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);

  // ── 1) 로그인하면 배경에서 채운다: 글은 규칙(서버 요청 없음), 이미지는 서버 한 번, 못 읽은 공고는 "못 찾음" ──
  await signIn(page, origin, '/board');
  await waitFor(() => textRow.hiring_process && imageRow.hiring_process && closedRow.hiring_process && duplicateRow.hiring_process, '네 지원 모두 채워짐');
  // 같은 공고는 한 번만 읽는다(이미지 받기·서버 요청 1번)
  assert.deepEqual(duplicateRow.hiring_process.steps, imageRow.hiring_process.steps);
  assert.equal(imageRequests, 1);
  assert.deepEqual(textRow.hiring_process.steps.map((step) => step.name), ['서류전형', '코딩테스트', '1차면접', '최종합격']);
  assert.equal(textRow.hiring_process.source, 'text');
  assert.equal(imageRow.hiring_process.source, 'ai');
  assert.deepEqual([closedRow.hiring_process.source, closedRow.hiring_process.steps.length], ['none', 0]);
  assert.equal(processRequests.length, 1, '서버(AI)는 이미지 공고 한 번만');
  assert.equal(processRequests[0].applicationId, imageRow.id);
  assert.ok(processRequests[0].images.length >= 1 && processRequests[0].images[0].mediaType === 'image/jpeg');
  // 다시 불러와도 다시 읽지 않는다
  await page.reload();
  await page.getByRole('heading', { level: 1, name: '지원 보드' }).waitFor();
  await page.waitForTimeout(800);
  assert.equal(processRequests.length, 1);

  // ── 2) 상세 패널: 서류 통과 지원은 첫 테스트 단계, 점을 누르면 지원 단계도 따라 바뀐다 ──
  await page.getByRole('group', { name: '보기 선택' }).getByRole('button', { name: '보드', exact: true }).click();
  await page.getByRole('button', { name: `${imageRow.company}, ${imageRow.position}, 서류 통과`, exact: true }).click();
  let panel = page.getByRole('dialog', { name: imageRow.company });
  const track = panel.getByRole('group', { name: `${imageRow.company} 전형 절차` });
  await track.getByRole('button', { name: '과제 전형 (현재 단계)' }).waitFor();
  await panel.getByText('공고 이미지에서 읽은 전형 절차예요.').waitFor();
  await scan(page, '상세 패널·전형 절차 트랙');
  await track.getByRole('button', { name: '임원 인터뷰로 옮기기' }).click();
  await track.getByRole('button', { name: '임원 인터뷰 (현재 단계)' }).waitFor();
  await waitFor(() => imageRow.status === 'interview' && imageRow.hiring_process.step === 2, '면접 예정으로 바뀌고 고른 단계 저장');
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'detached' });

  // ── 3) 절차 고치기: 한 줄로, 두 단계 미만이면 안내 ──
  await page.getByRole('button', { name: `${textRow.company}, ${textRow.position}, 지원 완료`, exact: true }).click();
  panel = page.getByRole('dialog', { name: textRow.company });
  await panel.getByRole('group', { name: `${textRow.company} 전형 절차` }).getByRole('button', { name: '서류전형 (현재 단계)' }).waitFor();
  await panel.getByRole('button', { name: '절차 고치기' }).click();
  const field = panel.getByRole('textbox', { name: '전형 절차' });
  assert.equal(await field.inputValue(), '서류전형 > 코딩테스트 > 1차면접 > 최종합격');
  await field.fill('서류');
  await panel.getByRole('button', { name: '저장' }).click();
  await panel.getByText(/두 단계 이상 적어 주세요/).waitFor();
  await field.fill('서류 > 인적성 > 1차 면접 > 2차 면접 > 최종 합격');
  await panel.getByRole('button', { name: '저장' }).click();
  await panel.getByRole('button', { name: '2차 면접로 옮기기' }).or(panel.getByRole('button', { name: '2차 면접으로 옮기기' })).waitFor();
  await waitFor(() => textRow.hiring_process.source === 'manual' && textRow.hiring_process.steps.length === 5, '직접 고친 절차 저장');
  await panel.getByText('직접 고친 전형 절차예요.').waitFor();
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'detached' });

  // ── 4) 절차를 못 찾은 공고는 기본 4단계 트랙과 "절차 넣기" ──
  await page.getByRole('button', { name: `${closedRow.company}, ${closedRow.position}, 지원 완료`, exact: true }).click();
  panel = page.getByRole('dialog', { name: closedRow.company });
  await panel.getByRole('group', { name: `${closedRow.company} 단계` }).waitFor();
  await panel.getByRole('button', { name: '절차 넣기' }).waitFor();

  assert.deepEqual(errors, []);
  console.log('PASS 전형 절차: 배경 채우기(글 규칙·이미지 AI 1번·같은 공고 재사용·못 읽은 공고 저장, 다시 안 읽음), 서류 통과 → 첫 테스트 단계, 점 누르면 면접 예정·고른 단계 저장, 절차 고치기(두 단계 미만 안내·저장), 못 찾으면 기본 트랙, axe, 브라우저 예외 0건');
} finally {
  await browser.close();
}
