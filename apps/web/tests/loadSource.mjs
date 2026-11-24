import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function resolveSource(sourcePath) {
  if (/\.tsx?$/.test(sourcePath)) return sourcePath;
  return fs.existsSync(sourcePath + '.ts') ? sourcePath + '.ts' : sourcePath + '.tsx';
}

// 프로젝트의 TS 별칭을 해석하며 API 경계만 대체한다. 테스트용 추가 의존성은 필요 없다.
// 상대 경로('./x.ts', '../../supabase/...')는 불러온 파일 기준(최상위 호출은 현재 폴더 기준)으로 읽는다.
// Supabase Edge Function(Deno) 공용 코드처럼 확장자까지 적어 불러오는 TS 파일도 읽을 수 있다(#228).
export function createSourceLoader(mocks = {}) {
  const cache = new Map();
  function load(specifier, fromFile) {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    const shared = specifier === '@jobdiary/shared';
    const relative = specifier.startsWith('.');
    if (!shared && !relative && !specifier.startsWith('@/')) return require(specifier);
    const filename = relative
      ? resolveSource(path.resolve(fromFile ? path.dirname(fromFile) : '.', specifier))
      : resolveSource(shared ? path.resolve('../../packages/shared/src/index') : path.resolve('src', specifier.slice(2)));
    const cacheKey = relative ? filename : specifier;
    if (cache.has(cacheKey)) return cache.get(cacheKey).exports;
    const loadedModule = { exports: {} };
    cache.set(cacheKey, loadedModule);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
      fileName: filename,
    });
    const execute = vm.runInThisContext(`(function(require, module, exports) {\n${outputText}\n})`, { filename });
    execute((child) => load(child, filename), loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return load;
}
