import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import zip from 'vite-plugin-zip-pack';
import { name, version } from '../package.json';

// 검증용 --outDir와 실제 ZIP의 소스가 달라지지 않도록 최종 Vite 설정을 사용한다.
export function releaseArchive(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'jobdiary-release-archive',
    apply: 'build',
    enforce: 'post',
    configResolved(resolved) { config = resolved; },
    closeBundle: {
      sequential: true,
      async handler() {
        // 개발 빌드에는 고정 키·localhost 연결을 허용한다. 배포 ZIP으로 만들지 않는다.
        if (config.mode !== 'production') return;
        const archive = zip({
          inDir: path.resolve(config.root, config.build.outDir),
          outDir: path.resolve(config.root, 'release'),
          outFileName: 'crx-' + name + '-' + version + '.zip',
          done(error) { if (error) throw error; },
        }) as Plugin;
        const hook = archive.closeBundle;
        if (typeof hook === 'function') await hook.call(this);
        else if (hook) await hook.handler.call(this);
      },
    },
  };
}
