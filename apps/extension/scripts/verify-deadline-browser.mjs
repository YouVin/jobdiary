// 실제 MV3 확장 실행. 모든 채용 사이트 HTTP 응답은 개인정보 없는 고정 표본으로 대체한다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createSourceLoader } from '../../web/tests/loadSource.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const output = path.resolve(root, 'release/deadline-validation');
const extension = path.resolve(process.env.EXTENSION_PATH || path.join(output, 'extension'));
const playwrightModule = process.env.PLAYWRIGHT_MODULE
  || path.join(root, 'apps/web/node_modules/.release-tools/node_modules/playwright/index.mjs');
const { chromium } = await import(pathToFileURL(path.resolve(playwrightModule)).href);
const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
assert(manifest.key, 'development 모드로 빌드한 확장을 사용하세요.');
assert(manifest.externally_connectable.matches.includes('http://localhost:3000/*'));
const expectedId = 'dckfpbmglbagcpnkkkdcnbnpjdpfjcde';
const hash = createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex').slice(0, 32);
assert.equal([...hash].map(char => String.fromCharCode(97 + parseInt(char, 16))).join(''), expectedId);

// 실제 웹앱 검증/가져오기 계획 함수를 사용하되 DB에는 접근하지 않는다.
const originalDirectory = process.cwd();
process.chdir(path.join(root, 'apps/web'));
const load = createSourceLoader();
const { sanitizeCollectResponse } = load('@/lib/extensionImport');
const { buildExtensionImportPlan } = load('@/utils/extensionImportPlan');
process.chdir(originalDirectory);

fs.mkdirSync(output, { recursive: true });
const profile = fs.mkdtempSync(path.join(output, 'profile-'));
const report = {
  startedAt: new Date().toISOString(),
  sourceCommit: execFileSync('git', ['-c', 'safe.directory=' + root.replaceAll('\\', '/'), '-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  scope: 'Chromium MV3 + synthetic HTTP responses + real web sanitizer/import planner; no real login or DB',
  extensionId: expectedId,
  manifestSha256: createHash('sha256').update(fs.readFileSync(path.join(extension, 'manifest.json'))).digest('hex'),
  checks: [],
};
const failures = [];
const requests = [];
let mobileFails = false;
let postingFails = false;
let context;
const jkUrl = 'https://www.jobkorea.co.kr/User/ApplyFixture';
const saraminUrl = 'https://www.saramin.co.kr/zf_user/persons/apply-status-list';
const wantedUrl = 'https://www.wanted.co.kr/status/applications/applied';
const html = body => '<!doctype html><html lang="ko"><head><meta charset="utf-8"></head><body>' + body + '</body></html>';
const jkRows = html('<table><tbody>' + ['101', '102'].map(id => '<tr><td class="description"><a href="/Recruit/GI_Read/' + id + '">검증 개발자</a></td><td><button data-memname="검증 회사 ' + id + '" data-gititle="검증 개발자" data-applydate="20261101120000" data-idx="apply-' + id + '"></button></td><td class="apply-status"><span class="item status">지원완료</span></td><td class="apply-progress"><span class="extra">' + (id === '101' ? '(~11/30)' : '(상시)') + '</span></td></tr>').join('') + '</tbody></table>');
const saraminRows = html('<div class="row _apply_list" data-company_nm="검증 사람인" data-rec_division="개발자" data-recruitapply_idx="201"><div class="recruit"><a href="/zf_user/jobs/relay/view?rec_idx=301">공고</a></div><div class="col_date">2026.11.01 12:00</div><div class="txt_status">지원완료</div></div>');
const mobileRows = html('<div class="apply_condition"><div class="status_list"><div class="box_apply"><input name="recruitapply_idx" value="201"><a class="name_job" href="/job-search/view?rec_idx=301"><span class="txt">개발자 (~2030-11-30)</span></a></div></div></div>');
const wantedRows = html('<ul><li class="table_tr_fixture"><span class="td_company_name_fixture">검증 원티드</span><span class="td_position_fixture">개발자</span><span class="td_create_time_fixture">2026. 11. 1</span><span class="td_status_fixture">지원완료</span></li></ul><button data-role="pagination-prev-button" disabled></button><button data-role="pagination-next-button" disabled></button>');
const posting = '<!doctype html><html><head><meta name="description" content="학력 : 무관, 마감일 : 2030.11.30"><script type="application/ld+json">' + JSON.stringify({ '@type': 'JobPosting', url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/101', identifier: { name: 'JobKorea', value: '101' }, validThrough: '2030-11-30T23:59' }) + '</script></head><body></body></html>';

async function check(name, run) {
  const start = Date.now();
  try {
    await run();
    report.checks.push({ name, passed: true, durationMs: Date.now() - start });
    console.log('PASS ' + name);
  } catch (error) {
    report.checks.push({ name, passed: false, error: error.message });
    throw error;
  }
}

try {
  context = await chromium.launchPersistentContext(profile, {
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'chromium' }),
    headless: true,
    args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension],
  });
  context.setDefaultTimeout(10000);
  context.on('page', page => page.on('pageerror', error => failures.push(error.message)));
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (!['http:', 'https:'].includes(url.protocol)) return route.continue();
    requests.push({ host: url.host, path: url.pathname });
    const send = body => route.fulfill({ contentType: 'text/html; charset=utf-8', body });
    if (url.hostname === 'www.jobkorea.co.kr' && url.pathname === '/User/ApplyFixture')
      return send(url.searchParams.has('Page') ? html('') : jkRows);
    if (url.hostname === 'www.jobkorea.co.kr' && url.pathname === '/Recruit/GI_Read/101')
      return postingFails ? route.fulfill({ status: 503, body: '' }) : send(posting);
    if (url.hostname === 'www.saramin.co.kr' && url.pathname === '/zf_user/persons/apply-status-list') return send(saraminRows);
    if (url.hostname === 'm.saramin.co.kr' && url.pathname === '/apply/state')
      return mobileFails ? route.fulfill({ status: 302, headers: { location: 'https://m.saramin.co.kr/login' } }) : send(mobileRows);
    if (url.hostname === 'www.wanted.co.kr' && url.pathname === '/status/applications/applied') return send(wantedRows);
    if (['localhost:3000', 'localhost:3001'].includes(url.host)) return send(html('확장 메시지 검증'));
    if (url.pathname === '/favicon.ico') return route.fulfill({ status: 204 });
    failures.push('Unexpected HTTP request: ' + url.origin + url.pathname);
    return route.abort();
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  assert.equal(new URL(worker.url()).host, expectedId);
  report.browserVersion = context.browser().version();
  const tabs = {};
  async function collect(name, url) {
    const page = tabs[name] || (tabs[name] = await context.newPage());
    await page.goto(url);
    await page.waitForLoadState('load');
    const tabId = await worker.evaluate(async target => (await chrome.tabs.query({})).find(tab => tab.url === target)?.id, url);
    assert(tabId, '수집 대상 탭이 존재해야 함');
    // 문서의 실제 content script 리스너 등록까지 기다린 뒤 메시지를 보낸다.
    let response;
    for (let attempt = 0; attempt < 4; attempt++) {
      response = await worker.evaluate(async id => {
        try { return await chrome.tabs.sendMessage(id, { type: 'COLLECT' }); }
        catch { return null; }
      }, tabId);
      if (response) break;
      await page.waitForTimeout(200);
    }
    assert(response && !response.error && !response.busy, '실제 content script 수집 응답');
    assert.equal(response.truncated, false);
    return response;
  }
  const webPage = await context.newPage();
  await webPage.goto('http://localhost:3000/');
  async function pull(page = webPage) {
    return page.evaluate(id => new Promise(resolve => {
      if (!globalThis.chrome?.runtime?.sendMessage) return resolve(null);
      chrome.runtime.sendMessage(id, { type: 'JOBDIARY_COLLECT' }, response => {
        if (chrome.runtime.lastError) return resolve(null);
        resolve(response);
      });
    }), expectedId);
  }
  await check('잡코리아 날짜 교차 확인·상시 제외·실제 storage 저장', async () => {
    const response = await collect('jk', jkUrl);
    assert.equal(response.count, 2);
    assert.deepEqual(response.deadlines, { matchedCount: 1, lookupFailed: false });
    assert.equal(response.applications[0].deadlineAt, '2030-11-30');
    assert.equal(Object.hasOwn(response.applications[1], 'deadlineAt'), false);
    assert(response.applications.every(item => item.status === 'applied'));
    const stored = await worker.evaluate(() => chrome.storage.local.get('jobdiary:collected'));
    assert.deepEqual(stored['jobdiary:collected'].jobkorea, response.applications);
    assert.equal(requests.filter(item => item.path === '/Recruit/GI_Read/101').length, 1);
  });
  await check('잡코리아 조회 503 실패에도 PC 지원내역 보존', async () => {
    postingFails = true;
    const response = await collect('jk', jkUrl);
    assert.equal(response.count, 2);
    assert.deepEqual(response.deadlines, { matchedCount: 0, lookupFailed: true });
    assert(response.applications.every(item => !Object.hasOwn(item, 'deadlineAt')));
    postingFails = false;
  });
  await check('사람인 content script→실제 service worker 모바일 조회→날짜 보충', async () => {
    const response = await collect('saramin', saraminUrl);
    assert.equal(response.count, 1);
    assert.deepEqual(response.deadlines, { matchedCount: 1, lookupFailed: false });
    assert.equal(response.applications[0].deadlineAt, '2030-11-30');
    assert.equal((await pull()).applications.length, 3, '다른 사이트 슬롯 유지');
  });
  await check('사람인 로그인 리다이렉트 실패에도 PC 지원내역 보존', async () => {
    mobileFails = true;
    const response = await collect('saramin', saraminUrl);
    assert.equal(response.count, 1);
    assert.deepEqual(response.deadlines, { matchedCount: 0, lookupFailed: true });
    assert.equal(Object.hasOwn(response.applications[0], 'deadlineAt'), false);
    mobileFails = false;
  });
  await check('원티드 기존 수집 유지·마감일 생략', async () => {
    const response = await collect('wanted', wantedUrl);
    assert.equal(response.count, 1);
    assert.equal(Object.hasOwn(response.applications[0], 'deadlineAt'), false);
    assert.equal((await pull()).applications.length, 4);
  });
  await check('재수집 슬롯 교체·웹앱 외부 메시지·실제 sanitizer/중복 계획', async () => {
    await collect('jk', jkUrl);
    const response = await pull();
    assert.equal(response.ok, true);
    assert.equal(response.applications.length, 4, '재수집해도 누적 중복 없음');
    const sanitized = sanitizeCollectResponse(response);
    assert.equal(sanitized.ok, true);
    const incoming = sanitized.applications.find(item => item.externalId === 'apply-101');
    assert.equal(incoming.deadlineAt, '2030-11-30');
    assert.equal(buildExtensionImportPlan([], [incoming]).toInsert[0].deadlineAt, '2030-11-30');
    const existing = { ...incoming, id: 'saved', updatedAt: '2026-11-01T00:00:00.000Z', status: 'interview', statusSource: 'manual', memo: '사용자 메모' };
    const plan = buildExtensionImportPlan([existing], [incoming]);
    assert.equal(plan.toInsert.length, 0);
    assert.equal(plan.skippedCount, 1);
    assert.equal(existing.status, 'interview');
    assert.equal(existing.memo, '사용자 메모');
  });
  await check('허용되지 않은 localhost 포트는 외부 메시지 차단', async () => {
    const page = await context.newPage();
    await page.goto('http://localhost:3001/');
    assert.equal(await pull(page), null);
  });
  await check('검증 페이지 오류·예상 밖 외부 HTTP 요청 없음', async () => {
    assert.deepEqual(failures, []);
  });
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.error = error.message;
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await context?.close();
  report.finishedAt = new Date().toISOString();
  report.requests = requests;
  fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('Report: ' + path.join(output, 'browser-report.json'));
}
