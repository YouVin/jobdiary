import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);

// 프로젝트의 TS 별칭을 해석하며 API 경계만 대체한다. 테스트용 추가 의존성은 필요 없다.
export function createSourceLoader(mocks = {}) {
  const cache = new Map();
  function load(specifier) {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    if (!specifier.startsWith('@/')) return require(specifier);
    if (cache.has(specifier)) return cache.get(specifier).exports;
    const sourcePath = path.resolve('src', specifier.slice(2));
    const filename = fs.existsSync(sourcePath + '.ts') ? sourcePath + '.ts' : sourcePath + '.tsx';
    const loadedModule = { exports: {} };
    cache.set(specifier, loadedModule);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
      fileName: filename,
    });
    const execute = vm.runInThisContext(`(function(require, module, exports) {\n${outputText}\n})`, { filename });
    execute(load, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return load;
}
