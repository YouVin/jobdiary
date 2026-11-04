const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root } = require('./browser.cjs');
const base = path.join(root, 'apps/extension/docs/store-screenshots');
const render = JSON.parse(fs.readFileSync(path.join(base, 'render-manifest.json'), 'utf8'));
const capture = JSON.parse(fs.readFileSync(path.join(base, 'raw/capture-manifest.json'), 'utf8'));
assert.equal(capture.exampleData, true); assert.equal(capture.unexpectedPageErrors, 0); assert.equal(capture.clipboardRows, 15);
assert.equal(render.files.length, 8);
for (const image of render.files) {
  const target = path.resolve(base, image.file); const contents = fs.readFileSync(target);
  assert.equal(contents.subarray(1, 4).toString(), 'PNG');
  assert.equal(contents.readUInt32BE(16), image.width, image.file);
  assert.equal(contents.readUInt32BE(20), image.height, image.file);
  assert(contents.length > 10000, '이미지 데이터 누락: ' + image.file);
}
for (const item of capture.captures) {
  const raw = fs.readFileSync(path.join(base, 'raw', item.name + '.png'));
  assert.equal(raw.readUInt32BE(16), item.width * 2);
  assert(Math.abs(raw.readUInt32BE(20) - item.height * 2) <= 2);
  assert.equal(item.scroll, false);
}
const files = ['README.md', 'apps/web/README.md', 'apps/extension/README.md',
  'apps/extension/scripts/store-screenshots/README.md', 'apps/extension/docs/store-screenshots/README.md', 'docs/GITHUB_SHOWCASE.md'];
let checked = 0;
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert(!source.includes('�'), 'UTF-8 문자 손상: ' + file);
  const targets = [...source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1]);
  targets.push(...[...source.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]));
  for (const rawTarget of targets) {
    if (/^(?:https?:|mailto:|#)/.test(rawTarget)) continue;
    const relative = decodeURIComponent(rawTarget.replace(/^<|>$/g, '').split('#')[0].split('?')[0]);
    if (!relative) continue;
    assert(fs.existsSync(path.resolve(root, path.dirname(file), relative)), file + ': 없는 링크 ' + relative); checked++;
  }
  const fences = source.split('\n').filter(line => /^```/.test(line));
  assert.equal(fences.length % 2, 0, '코드 블록 닫힘: ' + file);
}
console.log(JSON.stringify({ images: render.files.length, rawCaptures: capture.captures.length, relativeLinks: checked, exampleData: true, sourceUiCommit: capture.sourceUiCommit }, null, 2));
