// 화면별로 처음 받는 JS 크기 (#265). `npm run build` 뒤 apps/web에서: node scripts/measure-route-js.mjs [--json]
// 미리 만든 HTML(.next/server/app/*.html)의 <script src>를 모아, 파일 크기와 gzip 크기를 더한다.
// 화면에서 나중에 불러오는 조각(동적 import)은 처음 크기에 들어가지 않는다 → --chunks로 큰 조각 목록을 본다.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROUTES = { '/': 'index.html', '/board': 'board.html', '/account': 'account.html', '/login': 'login.html', '/signup': 'signup.html', '/privacy': 'privacy.html' };
const appDir = path.join('.next', 'server', 'app');
const gzipSize = (buffer) => zlib.gzipSync(buffer, { level: 9 }).length;
const kb = (bytes) => (bytes / 1024).toFixed(1);

function findHtml(name) {
  // 경로 묶음 폴더((protected) 등) 안에 있을 수 있다
  const stack = [appDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name === name) return full;
    }
  }
  return null;
}

const rows = [];
for (const [route, file] of Object.entries(ROUTES)) {
  const html = findHtml(file);
  if (!html) continue;
  // noModule 스크립트(옛 브라우저용 polyfill)는 요즘 브라우저가 받지 않으므로 뺀다
  const tags = [...fs.readFileSync(html, 'utf8').matchAll(/<script([^>]+)src="([^"]+\.js)"([^>]*)>/g)].filter((match) => !/noModule/i.test(match[1] + match[3]));
  const scripts = [...new Set(tags.map((match) => match[2]))];
  let raw = 0;
  let gzip = 0;
  for (const src of scripts) {
    const buffer = fs.readFileSync(path.join('.next', src.replace(/^\/_next\//, '')));
    raw += buffer.length;
    gzip += gzipSize(buffer);
  }
  rows.push({ route, files: scripts.length, rawKB: Number(kb(raw)), gzipKB: Number(kb(gzip)) });
}

if (process.argv.includes('--chunks')) {
  const dir = path.join('.next', 'static', 'chunks');
  const chunks = fs.readdirSync(dir).filter((name) => name.endsWith('.js')).map((name) => {
    const buffer = fs.readFileSync(path.join(dir, name));
    return { name, rawKB: Number(kb(buffer.length)), gzipKB: Number(kb(gzipSize(buffer))) };
  });
  chunks.sort((a, b) => b.gzipKB - a.gzipKB);
  console.table(chunks.slice(0, 15));
}

if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 2));
else console.table(rows);
