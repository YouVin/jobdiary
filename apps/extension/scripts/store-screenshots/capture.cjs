// 실제 확장 UI를 별도 프로필·예시 데이터로 촬영한다. 사용자의 로그인/저장소/클립보드에 접근하지 않는다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { root, loadBrowser, browserOptions } = require('./browser.cjs');
const extension = process.env.EXTENSION_PATH || path.join(root, 'release/github-screenshots/extension-development');
const output = path.join(root, 'apps/extension/docs/store-screenshots/raw');
const scratch = path.join(root, 'release/github-screenshots');
const key = 'jobdiary:collected';
const historyKey = 'jobdiary:application-history:v1:http://localhost:3000';
const sites = [
  { id: 'jobkorea', label: '잡코리아', url: 'https://www.jobkorea.co.kr/User/ApplyMng', count: 7 },
  { id: 'saramin', label: '사람인', url: 'https://www.saramin.co.kr/zf_user/persons/apply-status-list', count: 5 },
  { id: 'wanted', label: '원티드', url: 'https://www.wanted.co.kr/status/applications/applied', count: 3 },
];
const entries = [];
const slots = Object.fromEntries(sites.map(site => [site.id, Array.from({ length: site.count }, (_, index) => {
  const postingId = String(900101 + index);
  if (site.id !== 'wanted') entries.push({ platform: site.id, postingId, state: index === 1 ? 'canceled' : 'applied' });
  return { company: '가상회사 ' + String(index + 1).padStart(2, '0'), position: ['프론트엔드 개발자', '백엔드 개발자', '프로덕트 디자이너'][index % 3],
    platform: site.id, status: index === 1 ? 'canceled' : 'applied', appliedAt: '2026-11-01T00:00:00.000Z', externalId: site.id + '-' + index,
    ...(site.id === 'jobkorea' ? { url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/' + postingId }
      : site.id === 'saramin' ? { url: 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=' + postingId } : {}) };
})]));
const fixture = '<!doctype html><html lang="ko"><meta charset="utf-8"><style>body{margin:0;padding:28px;font:14px/1.6 system-ui;color:#18181b;background:#fafafa}h1{font-size:20px;margin:0 0 6px}p{font-size:12px;color:#52525b;margin:0 0 20px}article{background:white;border:1px solid #dedee2;border-radius:10px;padding:20px;margin-bottom:12px}a{color:#18181b;text-decoration:none;font-weight:600;font-size:15px}small{display:block;color:#52525b;margin-top:8px;font-size:12px}</style><h1>공고를 둘러보는 중</h1><p>개발 검증용 예시 · 실제 채용 사이트 화면이 아닙니다.</p><article data-sentry-component="CardJob"><a data-sentry-component="Title" href="/Recruit/GI_Read/900101">프론트엔드 개발자</a><small>가상회사 01</small></article><article data-sentry-component="CardJob"><a data-sentry-component="Title" href="/Recruit/GI_Read/900102">백엔드 개발자</a><small>가상회사 02</small></article><article data-sentry-component="CardJob"><a data-sentry-component="Title" href="/Recruit/GI_Read/99999999">프로덕트 디자이너</a><small>가상회사 03</small></article></html>';
async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
  assert(manifest.externally_connectable.matches.includes('http://localhost:3000/*'), '별도 정적 development 빌드를 사용하세요.');
  assert(!fs.readFileSync(path.join(extension, manifest.background.service_worker), 'utf8').includes('localhost:5173'), 'live 개발 dist 대신 별도 정적 빌드를 사용하세요.');
  fs.mkdirSync(output, { recursive: true }); fs.mkdirSync(scratch, { recursive: true });
  const chromium = await loadBrowser();
  const context = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(scratch, 'capture-profile-')), {
    ...browserOptions(), headless: true, locale: 'ko-KR', timezoneId: 'Asia/Seoul', viewport: { width: 1200, height: 760 }, deviceScaleFactor: 2,
    args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension],
  });
  const errors = [];
  try {
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (!['http:', 'https:'].includes(url.protocol)) return route.continue();
      assert(['www.jobkorea.co.kr', 'www.saramin.co.kr', 'www.wanted.co.kr'].includes(url.hostname), '예상하지 못한 외부 요청');
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: fixture });
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).host;
    const site = await context.newPage();
    const popup = await context.newPage();
    await popup.setViewportSize({ width: 360, height: 600 });
    // 운영체제 클립보드는 건드리지 않고 실제 복사 핸들러의 표 payload와 완료 UI만 검증한다.
    await popup.addInitScript(() => {
      window.__screenshotClipboard = {};
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        write: async items => { for (const type of items[0].types) window.__screenshotClipboard[type] = await (await items[0].getType(type)).text(); },
        writeText: async text => { window.__screenshotClipboard['text/plain'] = text; },
      } });
    });
    const popupUrl = 'chrome-extension://' + extensionId + '/src/popup/index.html';
    const captures = [];
    async function shot(name) {
      await popup.getByText(/수집한 지원 내역/).waitFor();
      const box = popup.locator('.diary-popup');
      const size = await box.evaluate(node => ({ width: node.clientWidth, height: node.getBoundingClientRect().height, scroll: node.scrollHeight > node.clientHeight + 1 }));
      assert.equal(size.scroll, false); assert(size.height <= 600);
      await box.screenshot({ path: path.join(output, name + '.png') }); captures.push({ name, ...size });
    }
    await worker.evaluate(() => chrome.storage.local.clear());
    for (const platform of sites) {
      await site.goto(platform.url);
      await site.bringToFront();
      if (popup.url() === 'about:blank') await popup.goto(popupUrl); else await popup.reload();
      await popup.locator('.diary-platform').filter({ hasText: platform.label }).waitFor();
      await popup.getByText('전체 0건', { exact: true }).waitFor();
      await shot('popup-empty-' + platform.id);
    }
    fs.copyFileSync(path.join(output, 'popup-empty-jobkorea.png'), path.join(output, 'popup-empty.png'));
    await site.goto(sites[0].url); await site.bringToFront();
    await worker.evaluate(async ({ key, slots, historyKey, entries }) => chrome.storage.local.set({ [key]: slots,
      [historyKey]: { version: 1, ownerKey: 'a'.repeat(64), syncedAt: '2026-11-04T16:00:00.000Z', entries, unidentifiedCount: 3 },
    }), { key, slots, historyKey, entries });
    await popup.reload(); await popup.getByText('전체 15건', { exact: true }).waitFor();
    await shot('popup-collected');
    // 촬영 중에만 2초 완료 표시의 복귀를 늦춘다. 제품 코드와 OS 클립보드는 바꾸지 않는다.
    await popup.evaluate(() => {
      const schedule = window.setTimeout.bind(window);
      window.setTimeout = (handler, delay, ...args) => schedule(handler, delay === 2000 ? 60000 : delay, ...args);
    });
    await popup.getByRole('button', { name: '전체 복사', exact: true }).click();
    await popup.getByRole('button', { name: '복사됐어요', exact: true }).waitFor();
    await shot('popup-copied');
    assert(await popup.getByRole('button', { name: '복사됐어요', exact: true }).isVisible());
    const clipboard = await popup.evaluate(() => window.__screenshotClipboard);
    assert.equal(clipboard['text/plain'].trim().split('\n').length, 16);
    assert(clipboard['text/html'].includes('<table'));
    await popup.reload(); await popup.locator('summary').click();
    await popup.getByRole('checkbox', { name: '지원 이력 자동 표시', exact: true }).waitFor();
    await shot('popup-history');
    await popup.locator('summary').click();
    await site.setViewportSize({ width: 680, height: 460 });
    await site.goto('https://www.jobkorea.co.kr/Search/?stext=개발자');
    await site.waitForFunction(() => document.querySelectorAll('[data-jobdiary-history]').length === 2);
    await site.screenshot({ path: path.join(output, 'history-site.png') });
    assert.deepEqual(errors, []);
    const report = { capturedAt: new Date().toISOString(), sourceUiCommit: execFileSync('git', ['-c', 'safe.directory=' + root, 'rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      exampleData: true, captures, collectionCounts: Object.fromEntries(sites.map(site => [site.id, site.count])), comparisonCount: entries.length,
      clipboardAdapter: 'mocked; actual payload generation and feedback UI; feedback reset delayed for capture', clipboardRows: 15, unexpectedPageErrors: errors.length };
    fs.writeFileSync(path.join(output, 'capture-manifest.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { await context.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
