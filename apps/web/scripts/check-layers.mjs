// 폴더 역할 검사 (#262). 규칙은 docs/CONVENTION.md "폴더 역할". npm run lint에 포함된다.
//   components·app (화면) → hooks(화면 동작) → store(상태) → lib(외부 통신) → utils(순수 함수)·types
// 화살표 반대 방향으로 불러오면 실패한다. 타입만 불러오는 것(import type)은 검사하지 않는다.
import fs from 'node:fs';
import path from 'node:path';

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(filename) : [filename];
  });
}

// 폴더별로 불러오면 안 되는 곳
const FORBIDDEN = {
  utils: [/^@\/(lib|store|hooks|components|app)\//, /^react$/, /^next\//, /^@supabase\//],
  types: [/^@\/(lib|store|hooks|components|app|utils)\//],
  lib: [/^@\/(hooks|components|app)\//],
  store: [/^@\/(hooks|components|app)\//],
  hooks: [/^@\/(components|app)\//],
};
// Supabase 클라이언트와 SDK 값(함수·클래스)은 lib에서만 쓴다. 화면은 lib의 함수를 부른다.
const SUPABASE = /^(@\/lib\/supabase|@supabase\/supabase-js)$/;
// lib에서 store를 읽는 것은 상태를 바깥(익스텐션·인증 이벤트)과 맞추는 *Sync.ts만 허용한다.
const STORE = /^@\/store\//;

// 여러 줄에 걸친 import { a, b } from '...'도 잡도록 파일 전체에서 찾는다. export ... from도 같다.
const IMPORT = /^\s*(?:import|export)\s+(type\s+)?(?:[^;'"]*?\sfrom\s+)?['"]([^'"]+)['"]/gm;
let failures = 0;
const fail = (file, line, message) => {
  console.error(`${file}:${line}: ${message}`);
  failures += 1;
};

for (const filename of listFiles('src').filter((file) => /\.(tsx?)$/.test(file))) {
  const layer = filename.split(path.sep)[1];
  const text = fs.readFileSync(filename, 'utf8');
  for (const match of text.matchAll(IMPORT)) {
    if (match[1]) continue; // import type은 실행 코드에 들어가지 않는다
    const source = match[2];
    const line = text.slice(0, match.index).split('\n').length;
    for (const pattern of FORBIDDEN[layer] ?? []) {
      if (pattern.test(source)) fail(filename, line, `${layer}에서 ${source}를 불러오지 않아요(docs/CONVENTION.md 폴더 역할).`);
    }
    if (SUPABASE.test(source) && layer !== 'lib') {
      fail(filename, line, `Supabase는 lib에서만 불러요. lib의 함수를 만들어 쓰세요(${source}).`);
    }
    if (layer === 'lib' && STORE.test(source) && !/Sync\.ts$/.test(filename)) {
      fail(filename, line, `lib에서 store를 읽는 것은 *Sync.ts만 허용해요(${source}).`);
    }
  }
}
if (failures) process.exitCode = 1;
else console.log('폴더 역할 검사 통과');
