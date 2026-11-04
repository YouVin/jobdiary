const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../../../..');
async function loadBrowser() {
  const candidates = [process.env.PLAYWRIGHT_MODULE,
    path.join(root, 'release/screenshot-tools/node_modules/playwright/index.mjs'),
    path.join(root, 'apps/web/node_modules/.release-tools/node_modules/playwright/index.mjs')].filter(Boolean);
  const modulePath = candidates.find(file => fs.existsSync(file));
  if (!modulePath) throw new Error('Playwright가 없습니다. 이 폴더 README의 별도 도구 설치 절차를 확인하세요.');
  return (await import(pathToFileURL(modulePath).href)).chromium;
}
const browserOptions = () => process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'chromium' };
module.exports = { root, loadBrowser, browserOptions };
