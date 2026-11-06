// 실제 배포 ZIP이 현재 운영 빌드와 파일 단위로 같은지 검사한다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(root, '../..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const build = path.resolve(root, process.argv[2] || 'dist');
const archive = path.resolve(root, process.argv[3] || 'release/crx-' + pkg.name + '-' + pkg.version + '.zip');
const require = createRequire(import.meta.url);
// 기존 ZIP 플러그인이 사용하는 동일한 판독 라이브러리를 재사용한다.
const JSZip = createRequire(require.resolve('vite-plugin-zip-pack'))('jszip');
const bytes = fs.readFileSync(archive);
const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
assert.equal(manifest.version, pkg.version);
assert.equal(manifest.manifest_version, 3);
assert(!('key' in manifest), '운영 ZIP에 개발 고정 키를 넣지 않는다');
assert.deepEqual(manifest.permissions, ['storage']);
assert.deepEqual(manifest.externally_connectable.matches, ['https://jobdiary.vercel.app/*']);
assert.deepEqual(manifest.host_permissions, ['https://*.saramin.co.kr/*', 'https://www.jobkorea.co.kr/*', 'https://jobkorea.co.kr/*', 'https://www.wanted.co.kr/*', 'https://wanted.co.kr/*']);
assert.equal(manifest.content_scripts.length, 4);
assert.equal(manifest.content_scripts.filter(script => script.js.some(name => name.includes('historyBadges'))).length, 1);
const references = [manifest.background.service_worker, manifest.action.default_popup, ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon), ...(manifest.web_accessible_resources || []).flatMap(item => item.resources).filter(name => !name.includes('*')), ...manifest.content_scripts.flatMap(script => [...script.js, ...(script.css || [])])];
for (const name of references) assert(zip.file(name), 'Manifest에서 참조한 파일이 ZIP에 있어야 한다: ' + name);
const walk = (directory, prefix = '') => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name), prefix + entry.name + '/') : [prefix + entry.name]);
const files = Object.values(zip.files).filter(entry => !entry.dir).map(entry => entry.name).sort();
assert.deepEqual(files, walk(build).sort(), '현재 빌드 파일만 빠짐없이 압축한다');
for (const name of files) {
  assert(!/(^|\/)\.env|\.pem$|\.map$|(^|\/)node_modules\//i.test(name), '환경 파일·개인키·소스맵·node_modules 제외');
  const content = await zip.file(name).async('nodebuffer');
  assert(content.equals(fs.readFileSync(path.join(build, name))), 'ZIP/운영 빌드 내용 일치: ' + name);
  if (/\.(js|html)$/.test(name)) assert(!/localhost:5173|\/@vite\/client|@crx\/client-worker|__LIVE_RELOAD__/.test(content.toString()), '개발 서버 로더 제외: ' + name);
}
for (const size of [16, 48, 128]) {
  const content = await zip.file(manifest.icons[size]).async('nodebuffer');
  assert.equal(content.readUInt32BE(16), size); assert.equal(content.readUInt32BE(20), size);
}
const report = { passed: true, at: new Date().toISOString(), version: pkg.version,
  build: path.relative(repo, build).replaceAll('\\', '/'), archive: path.relative(repo, archive).replaceAll('\\', '/'),
  bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), files: files.length,
  checks: ['ZIP CRC32', '모든 빌드 파일 일치', 'MV3/버전', '운영 연결 주소/권한', 'manifest 참조/아이콘', '개발 로더/비밀 파일 제외'] };
const reportPath = path.join(repo, 'release/extension-release-validation/package-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
