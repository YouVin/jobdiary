// 실제 MV3 재로드 뒤 예전 content script의 정리를 확인한다. 새 주입 회귀는 기존 브라우저 검증에서 확인한다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const output = path.join(root, 'release/reload-validation');
const extension = process.env.EXTENSION_PATH || path.join(output, 'development');
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || path.join(root, 'apps/web/node_modules/.release-tools/node_modules/playwright/index.mjs')).href);
const report = { checks: [], scope: 'Actual Chromium MV3 runtime reload with synthetic site HTTP; actual served development worker exercised in a VM with a fake socket.' };
const key = 'jobdiary:application-history:v1:http://localhost:3000';
const marker = '[data-jobdiary-history]';
fs.mkdirSync(output, { recursive: true });
let context;
try {
  const devOrigin = process.env.DEV_SERVER_ORIGIN || 'http://localhost:5173';
  const response = await fetch(devOrigin + '/@crx/client-worker');
  assert(response.ok);
  const code = await response.text();
  assert(!code.includes('__LIVE_RELOAD__'), '실제 worker 응답에 미치환 토큰이 없어야 함');
  const handlers = new Map();
  let reloads = 0;
  const sandbox = {
    URL, Headers, Response, location: { protocol: 'chrome-extension:', hostname: 'test-extension' },
    chrome: { runtime: { id: 'test-extension', reload: () => reloads++, onConnect: { addListener() {} }, onConnectExternal: { addListener() {} } } },
    self: { addEventListener() {} }, console: { log() {}, error() {} },
    WebSocket: class { addEventListener(name, listener) { const list = handlers.get(name) || []; list.push(listener); handlers.set(name, list); } send() {} },
    fetch: async () => ({ ok: true }), setInterval: () => 1, clearInterval() {}, setTimeout,
  };
  vm.runInNewContext(code, sandbox, { timeout: 1000 });
  for (const handler of handlers.get('message') || []) await handler({ data: JSON.stringify({ type: 'custom', event: 'crx:runtime-reload' }) });
  assert.equal(reloads, 1);
  for (const handler of handlers.get('close') || []) await handler({ wasClean: false });
  assert.equal(reloads, 2);
  report.checks.push('실제 개발 worker의 runtime-reload·소켓 재연결 경로에 미정의 변수가 없다');

  context = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(output, 'browser-profile-')), {
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'chromium' }),
    headless: true, ignoreDefaultArgs: ['--disable-extensions'], args: ['--enable-unsafe-extension-debugging'],
  });
  const browserCdp = await context.browser().newBrowserCDPSession();
  const loaded = await browserCdp.send('Extensions.loadUnpacked', { path: extension });
  const extensionId = loaded.id;
  assert.equal(typeof extensionId, 'string');
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await context.route('https://www.jobkorea.co.kr/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><body><a href="/Recruit/GI_Read/101">검증 개발자</a></body></html>' }));
  const control = await context.newPage();
  await control.goto('chrome-extension://' + extensionId + '/src/popup/index.html');
  await control.evaluate(async key => chrome.storage.local.set({ [key]: {
    version: 1, ownerKey: 'a'.repeat(64), syncedAt: new Date().toISOString(), unidentifiedCount: 0,
    entries: [{ platform: 'jobkorea', postingId: '101', state: 'applied' }],
  } }), key);
  const page = await context.newPage();
  await page.goto('https://www.jobkorea.co.kr/User/ApplyMng');
  await page.locator(marker).waitFor();
  await control.evaluate(() => chrome.runtime.reload()).catch(error => {
    if (!/closed|destroyed|Target/.test(error.message)) throw error;
  });
  await page.waitForFunction(marker => {
    window.dispatchEvent(new Event('pageshow'));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('popstate'));
    return document.querySelectorAll(marker).length === 0;
  }, marker, { polling: 100, timeout: 10000 });
  assert.deepEqual(errors, []);
  report.checks.push('실제 확장 재로드 뒤 기존 탭의 이벤트가 예외 없이 오래된 배지를 정리한다');
  report.passed = true;
  for (const check of report.checks) console.log('PASS ' + check);
} catch (error) {
  report.passed = false; report.error = error.stack || String(error); console.error(report.error); process.exitCode = 1;
} finally {
  await context?.close();
  fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2));
}
