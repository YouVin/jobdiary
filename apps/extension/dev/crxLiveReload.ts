import type { Plugin } from 'vite'

// CRXJS 2.7.1은 worker 템플릿 토큰의 첫 등장만 치환한다. 나머지 참조도 같은 옵션으로 맞춘다.
export function replaceCrxLiveReload(code: string, id: string, liveReload: boolean) {
  if (id.split('?')[0] !== '/@crx/client-worker' || !code.includes('__LIVE_RELOAD__')) return null
  return { code: code.replaceAll('__LIVE_RELOAD__', String(liveReload)), map: null }
}

export function crxLiveReloadCompatibility(liveReload: boolean): Plugin {
  return {
    name: 'jobdiary:crx-live-reload-compatibility',
    apply: 'serve',
    enforce: 'post',
    transform(code, id) { return replaceCrxLiveReload(code, id, liveReload) },
  }
}
