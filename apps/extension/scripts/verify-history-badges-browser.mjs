// 실제 MV3 주입·팝업·동적 목록과 성능 검증. 사이트 응답은 개인정보 없는 표본으로 대체한다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const output = path.join(root, 'release/badge-validation');
const extension = process.env.EXTENSION_PATH || path.join(output, 'extension-development');
const devOrigin = process.env.DEV_SERVER_ORIGIN ? new URL(process.env.DEV_SERVER_ORIGIN).origin : null;
const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
assert(manifest.content_scripts?.some(script => script.js?.some(file => file.includes('historyBadges'))),
  '로드할 확장의 manifest에 historyBadges가 없습니다. dev:extension을 재시작한 뒤 확장과 사이트를 다시 로드하세요.');
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || path.join(root, 'apps/web/node_modules/.release-tools/node_modules/playwright/index.mjs')).href);
const key = 'jobdiary:application-history:v1:http://localhost:3000';
const settingsKey = 'jobdiary:history-display:v1';
const marker = '[data-jobdiary-history]';
const origin = 'https://www.jobkorea.co.kr';
const entries = [{ platform: 'jobkorea', postingId: '101', state: 'applied' }, { platform: 'jobkorea', postingId: '102', state: 'canceled' },
  { platform: 'saramin', postingId: '201', state: 'applied' }];
const cache = (values = entries) => ({ version: 1, ownerKey: 'a'.repeat(64), entries: values, unidentifiedCount: 2, syncedAt: new Date().toISOString() });
const html = body => '<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>body{margin:24px;font:14px/1.5 system-ui;color:#18181b;background:#fafafa}h1{font-size:24px}article{box-sizing:border-box;height:82px;display:grid;grid-template-columns:minmax(0,1fr) 96px;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #dedee2;background:white}a{color:#18181b;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}button{padding:8px;background:#4f46e5;color:white;border:0;border-radius:4px}#rows{max-width:900px}</style></head><body>' + body + '</body></html>';
const anchor = (id, title = '프론트엔드 개발자') => '<a href="/Recruit/GI_Read/' + id + '">' + title + '</a>';
const fixture = html('<h1>AI 추천공고 검증 표본</h1><div id="rows"><article>' + anchor('101') + '<button>지원</button></article><article>' + anchor('102', '지원 취소한 공고') + '<button>지원</button></article><article>' + anchor('999', '이력이 확인되지 않은 공고') + '<button>지원</button></article></div>');
// 2026-11-04 공개 검색의 CardJob/Title 구조를 개인정보 없는 텍스트로 재현한다.
const searchCard = (id, postingId, companyId = postingId) => '<div id="' + id + '" data-sentry-component="CardJob"><a href="/Recruit/GI_Read/' + postingId + '"><img alt="회사 로고"></a><div><a data-sentry-component="Title" href="/Recruit/GI_Read/' + postingId + '?listno=1">AI 개발자</a><span><a data-fixture-company href="/Recruit/GI_Read/' + companyId + '">예시 회사</a></span></div><button>지원</button></div>';
const search = html('<style>[data-sentry-component="CardJob"]{display:flex;align-items:center;gap:16px;padding:24px;margin-bottom:16px;background:white;border-radius:12px;max-width:850px}[data-sentry-component="CardJob"]>div{flex:1}[data-sentry-component="Title"]{display:block;font-weight:600;margin-bottom:6px}[data-fixture-company]{font-size:13px;color:#52525b}</style><h1>검색 카드 중복 표시 검증 표본</h1>'
  + searchCard('card-one', '101') + searchCard('card-two', '101') + searchCard('card-other', '999', '101'));
const large = html('<h1>긴 목록 성능 검증</h1><div id="rows">' + Array.from({ length: 5000 }, (_, index) => '<article data-sentry-component="CardJob">' + anchor(String(1000 + index), '표본 공고 ' + index).replace('<a ', '<a data-sentry-component="Title" ') + '<button>지원</button></article>').join('') + '</div>');
const report = { at: new Date().toISOString(), checks: [], metrics: {}, cpu: os.cpus()[0]?.model, scope: 'Synthetic site HTTP, actual Chromium MV3 and popup. Performance values include fixture page work.' };
let context;
const errors = [];
const requests = [];
const check = async (name, run) => { await run(); report.checks.push(name); console.log('PASS ' + name); };
fs.mkdirSync(output, { recursive: true });
try {
  context = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(output, 'browser-profile-')), {
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'chromium' }),
    headless: true, viewport: { width: 1280, height: 800 }, args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension],
  });
  context.setDefaultTimeout(15000);
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['http:', 'https:'].includes(url.protocol)) return route.continue();
    // Live CRXJS는 localhost 모듈을 읽는다. 사이트 HTTP 추가 여부와 분리한다.
    if (devOrigin && url.origin === devOrigin) return route.continue();
    requests.push(url.origin + url.pathname);
    if (url.pathname === '/favicon.ico') return route.fulfill({ status: 204 });
    if (url.hostname === 'www.jobkorea.co.kr') {
      if (url.pathname === '/Search/') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: search });
      if (url.pathname === '/User/Large') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: large });
      if (url.pathname.startsWith('/Recruit/GI_Read/')) return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html('<h1>개발자 상세 공고</h1><button>지원</button>') });
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: fixture });
    }
    if (url.hostname === 'www.saramin.co.kr') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html('<h1>사람인 공고 목록</h1><a href="/zf_user/jobs/relay/view?rec_idx=201">사람인 개발자</a>') });
    if (url.hostname === 'www.wanted.co.kr') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html('<a href="/wd/101">원티드 표본</a>') });
    errors.push('Unexpected external request');
    return route.abort();
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  const writeCache = values => worker.evaluate(async ({ key, values }) => chrome.storage.local.set({ [key]: values }), { key, values });
  const toggle = enabled => worker.evaluate(async ({ settingsKey, enabled }) => chrome.storage.local.set({ [settingsKey]: { enabled } }), { settingsKey, enabled });
  const waitCount = (page, count) => page.waitForFunction(({ marker, count }) => document.querySelectorAll(marker).length === count, { marker, count }, { polling: 50, timeout: 15000 });
  const page = await context.newPage();
  await page.goto(origin + '/User/AI');
  await check('캐시 없는 기본 상태에서는 공고를 미지원으로 표시하지 않는다', async () => {
    await page.waitForTimeout(100);
    assert.equal(await page.locator(marker).count(), 0);
  });
  await check('지원/취소 일치만 표시하고 수집 대상 텍스트와 버튼 위치를 보존한다', async () => {
    const before = await page.locator('button').first().boundingBox();
    const networkCount = requests.length;
    await writeCache(cache()); await waitCount(page, 2);
    assert.equal(await page.locator('a').first().textContent(), '프론트엔드 개발자');
    assert.match(await page.locator(marker).nth(1).getAttribute('aria-label'), /지원취소/);
    assert.deepEqual(await page.locator('button').first().boundingBox(), before);
    assert.equal(requests.length, networkCount, '배지 표시로 사이트 HTTP 요청이 추가되지 않음');
    await page.screenshot({ path: path.join(output, 'jobkorea-list.png') });
  });
  await check('동적 추가·가상 목록 href 변경·삭제·정상 재삽입을 반영한다', async () => {
    await page.evaluate(() => {
      const row = document.createElement('article'); row.id = 'dynamic-row';
      row.innerHTML = '<a href="/Recruit/GI_Read/101">동적 공고</a><button>지원</button>';
      document.querySelector('#rows').append(row);
    });
    await waitCount(page, 3);
    await page.locator('#dynamic-row a').evaluate(anchor => anchor.href = '/Recruit/GI_Read/999');
    await waitCount(page, 2);
    await page.locator('#dynamic-row a').evaluate(anchor => anchor.href = '/Recruit/GI_Read/101');
    await waitCount(page, 3);
    await page.locator('#dynamic-row').evaluate(row => row.remove());
    await waitCount(page, 2);
  });
  await check('360px 팝업의 수집 15건·연결 정보·스위치를 스크롤 없이 확인한다', async () => {
    await worker.evaluate(async () => {
      const app = { company: '검증 회사', position: '개발자', status: 'applied', appliedAt: '2026-11-01T00:00:00Z' };
      await chrome.storage.local.set({ 'jobdiary:collected': {
        saramin: Array.from({ length: 5 }, () => ({ ...app, platform: 'saramin' })),
        jobkorea: Array.from({ length: 10 }, () => ({ ...app, platform: 'jobkorea' })), wanted: [],
      } });
    });
    const popup = await context.newPage();
    await popup.setViewportSize({ width: 360, height: 600 });
    await popup.goto('chrome-extension://' + extensionId + '/src/popup/index.html');
    const checkbox = popup.getByRole('checkbox', { name: '지원 이력 자동 표시', exact: true });
    await popup.getByText('전체 15건', { exact: true }).waitFor();
    const measurePopup = async name => {
      const size = await popup.evaluate(() => {
        const box = document.querySelector('#root > div');
        return { height: box.getBoundingClientRect().height, scrollHeight: box.scrollHeight, clientHeight: box.clientHeight,
          documentHeight: document.documentElement.scrollHeight, viewportHeight: innerHeight, open: !!document.querySelector('details').open };
      });
      assert(size.height <= (size.open ? 600 : 520), name + ': 기본 520px·설정 펼침 600px 이하여야 함');
      assert(size.scrollHeight <= size.clientHeight + 1, name + ': 내부 스크롤 없음');
      assert(size.documentHeight <= size.viewportHeight, name + ': 페이지 스크롤 없음');
      report.metrics.popup ??= {}; report.metrics.popup[name] = size;
    };
    await measurePopup('connected');
    assert.equal(await popup.locator('details').getAttribute('open'), null);
    await popup.locator('#root > div').screenshot({ path: path.join(output, 'popup-classic.png') });
    await popup.locator('summary').click();
    await checkbox.click();
    await popup.waitForFunction(() => { const input = document.querySelector('#history-display-enabled'); return input && !input.checked && !input.disabled; });
    await waitCount(page, 0);
    await popup.getByText('자동 표시 꺼짐', { exact: true }).waitFor();
    await popup.getByText(/식별하지 못한 지원 2건/).waitFor({ state: 'visible' });
    await measurePopup('details');
    await checkbox.click();
    await popup.waitForFunction(() => { const input = document.querySelector('#history-display-enabled'); return input && input.checked && !input.disabled; });
    await popup.locator('summary').click();
    await writeCache({ ...cache([]), unidentifiedCount: 35 });
    await popup.getByText('비교할 수 있는 공고가 없어요', { exact: true }).waitFor();
    await measurePopup('unidentified');
    await popup.locator('#root > div').screenshot({ path: path.join(output, 'popup-classic-unidentified.png') });
    await popup.locator('summary').click();
    await popup.getByText(/수집한 뒤 아래/).waitFor({ state: 'visible' });
    await measurePopup('unidentifiedDetails');
    await popup.locator('summary').click();
    await worker.evaluate(key => chrome.storage.local.remove(key), key);
    await popup.getByText('지원 이력 연결 필요', { exact: true }).waitFor();
    await measurePopup('disconnected');
    await writeCache(cache());
    await page.bringToFront(); await waitCount(page, 2);
    await popup.close();
  });
  await check('잡코리아 검색 카드에는 제목에만 하나씩 표시하고 같은 공고의 다른 카드도 유지한다', async () => {
    const searchPage = await context.newPage(); await searchPage.goto(origin + '/Search/?stext=AI');
    await waitCount(searchPage, 2);
    for (const id of ['card-one', 'card-two']) {
      const card = searchPage.locator('#' + id);
      assert.equal(await card.locator(marker).count(), 1);
      assert.equal(await card.locator('a[data-sentry-component="Title"] ' + marker).count(), 1);
      assert.equal(await card.locator('[data-fixture-company] ' + marker).count(), 0);
      assert.equal(await card.locator('[data-fixture-company]').textContent(), '예시 회사');
    }
    assert.equal(await searchPage.locator('#card-other ' + marker).count(), 0);
    await searchPage.screenshot({ path: path.join(output, 'jobkorea-single-card.png') });
    await searchPage.locator('#card-one').evaluate(card => card.insertAdjacentHTML('afterbegin',
      '<a data-sentry-component="Title" href="/Recruit/GI_Read/102">동적으로 바뀐 공고</a>'));
    await searchPage.waitForFunction(() => document.querySelector('#card-one [data-jobdiary-history]')?.getAttribute('aria-label').includes('지원취소'));
    assert.equal(await searchPage.locator('#card-one ' + marker).count(), 1);
    await searchPage.locator('#card-one > a').first().evaluate(anchor => anchor.remove());
    await searchPage.waitForFunction(() => document.querySelector('#card-one [data-jobdiary-history]')?.getAttribute('aria-label').includes('지원 이력 있음'));
    assert.equal(await searchPage.locator('#card-one ' + marker).count(), 1);
    await searchPage.close(); await page.bringToFront(); await waitCount(page, 2);
  });
  await check('상세 URL와 제목에 지원 이력을 표시하고 사람인 목록도 연결한다', async () => {
    const detail = await context.newPage(); await detail.goto(origin + '/Recruit/GI_Read/101');
    await waitCount(detail, 1);
    assert.equal(await detail.locator('h1').textContent(), '개발자 상세 공고');
    const saramin = await context.newPage(); await saramin.goto('https://www.saramin.co.kr/zf_user/jobs/list/domestic');
    await waitCount(saramin, 1);
    assert.equal(await saramin.locator('a').textContent(), '사람인 개발자');
    await detail.close(); await saramin.close(); await page.bringToFront();
    await waitCount(page, 2);
  });
  await check('원티드는 공고 식별 조사 전 표시 범위에서 제외한다', async () => {
    const wanted = await context.newPage(); await wanted.goto('https://www.wanted.co.kr/wd/101');
    await wanted.waitForTimeout(100);
    assert.equal(await wanted.locator(marker).count(), 0);
    await wanted.close(); await page.bringToFront(); await waitCount(page, 2);
  });
  await check('캐시 삭제와 새 계정의 다른 이력을 기존 배지에 반영한다', async () => {
    await worker.evaluate(key => chrome.storage.local.remove(key), key); await waitCount(page, 0);
    await writeCache({ ...cache([{ platform: 'jobkorea', postingId: '999', state: 'applied' }]), ownerKey: 'b'.repeat(64) });
    await waitCount(page, 1);
    assert.equal(await page.locator('a').nth(2).locator(marker).count(), 1);
  });

  const big = await context.newPage(); await toggle(true);
  await worker.evaluate(key => chrome.storage.local.remove(key), key);
  await big.goto(origin + '/User/Large');
  const cdp = await context.newCDPSession(big);
  await cdp.send('Performance.enable');
  const measure = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    const heap = await cdp.send('Runtime.getHeapUsage');
    const dom = await cdp.send('Memory.getDOMCounters');
    const metrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(item => [item.name, item.value]));
    return { heapBytes: heap.usedSize, domNodes: dom.nodes, taskSeconds: metrics.TaskDuration, layoutCount: metrics.LayoutCount };
  };
  await big.waitForTimeout(100);
  const baseline = await measure();
  const taskSeconds = async () => (await cdp.send('Performance.getMetrics')).metrics.find(item => item.name === 'TaskDuration').value;
  const denseEntries = Array.from({ length: 20000 }, (_, index) => ({ platform: 'jobkorea', postingId: String(index < 999 ? 1000 + index : index === 999 ? 5999 : 100000 + index), state: 'applied' }));
  await check('5,000개 공고 링크·20,000개 비교 키에서 1,000개 정확한 배지 표시', async () => {
    const startTask = await taskSeconds();
    const start = Date.now();
    await writeCache(cache(denseEntries));
    await waitCount(big, 1000);
    const wallMs = Date.now() - start;
    const endTask = await taskSeconds();
    const loaded = await measure();
    report.metrics.largeList = { links: 5000, cacheEntries: 20000, badges: 1000, wallMs,
      heapDeltaBytes: loaded.heapBytes - baseline.heapBytes, taskDeltaMs: (endTask - startTask) * 1000, domNodeDelta: loaded.domNodes - baseline.domNodes };
    assert(loaded.heapBytes - baseline.heapBytes < 25 * 1024 * 1024, '표본의 추가 JS heap 25MiB 미만');
  });
  await check('유휴 구간에 반복 DOM 변경이 없고 긴 목록을 제거하면 노드가 정리된다', async () => {
    const idleBefore = await measure();
    const startTask = await taskSeconds();
    await big.waitForTimeout(750);
    const endTask = await taskSeconds();
    const idleAfter = await measure();
    report.metrics.idle = { wallMs: 750, taskDeltaMs: (endTask - startTask) * 1000, domNodeDelta: idleAfter.domNodes - idleBefore.domNodes };
    assert.equal(idleAfter.domNodes, idleBefore.domNodes);
    await big.evaluate(() => document.getElementById('rows').remove());
    await waitCount(big, 0);
    await big.waitForTimeout(100);
    const removed = await measure();
    report.metrics.removed = { heapBytes: removed.heapBytes, domNodes: removed.domNodes, releasedHeapBytes: idleAfter.heapBytes - removed.heapBytes };
    assert(removed.domNodes < idleAfter.domNodes / 4, '삭제된 목록·배지 DOM 대부분 해제');
  });
  await check('동적 노드 생성·제거를 반복해도 DOM 참조가 누적되지 않는다', async () => {
    const cycles = [];
    for (let cycle = 0; cycle < 3; cycle++) {
      await big.evaluate(() => {
        const rows = document.createElement('div'); rows.id = 'cycle-rows';
        rows.innerHTML = Array.from({ length: 500 }, (_, index) => '<a href="/Recruit/GI_Read/' + (1000 + index) + '">반복 표본</a>').join('');
        document.body.append(rows);
      });
      await waitCount(big, 500);
      await big.evaluate(() => document.getElementById('cycle-rows').remove());
      await waitCount(big, 0);
      await big.waitForTimeout(100);
      cycles.push(await measure());
    }
    report.metrics.cycles = cycles;
    assert(cycles[2].heapBytes - cycles[0].heapBytes < 2 * 1024 * 1024, '반복 제거 후 유지되는 JS heap 증가 2MiB 미만');
  });
  await check('여러 탭의 설정 변경을 반영하고 실제 가시성 상태를 기록한다', async () => {
    const tabs = [];
    await writeCache(cache(entries));
    for (let index = 0; index < 3; index++) {
      const tab = await context.newPage(); await tab.goto(origin + '/User/AI?tab=' + index); tabs.push(tab);
    }
    await toggle(false);
    for (const tab of tabs) await waitCount(tab, 0);
    report.metrics.tabs = await Promise.all(tabs.map(tab => tab.evaluate(() => ({ visibility: document.visibilityState, badges: document.querySelectorAll('[data-jobdiary-history]').length }))));
    await toggle(true);
    for (const tab of tabs) { await tab.bringToFront(); await waitCount(tab, 2); }
    for (const tab of tabs) await tab.close();
  });
  await check('페이지 오류·예상 밖 외부 요청 없음', async () => { assert.deepEqual(errors, []); });
  report.passed = true;
  report.browser = context.browser().version();
} catch (error) { report.passed = false; report.error = error.message; console.error(error.stack); process.exitCode = 1; }
finally { await context?.close(); fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2)); console.log('Report: release/badge-validation/browser-report.json'); }
