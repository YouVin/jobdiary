import { expect, it } from 'vitest'
import { crxLiveReloadCompatibility, replaceCrxLiveReload } from './crxLiveReload'

it('worker의 재연결과 런타임 갱신에 남은 모든 live reload 토큰을 치환한다', () => {
  const code = 'if (!true) return; if (__LIVE_RELOAD__) reconnect(); if (__LIVE_RELOAD__) reload();'
  expect(replaceCrxLiveReload(code, '/@crx/client-worker', true)?.code).toBe('if (!true) return; if (true) reconnect(); if (true) reload();')
})
it('동일한 liveReload 옵션을 사용하고 운영 빌드에는 적용하지 않는다', () => {
  expect(replaceCrxLiveReload('if (__LIVE_RELOAD__) reload();', '/@crx/client-worker?v=1', false)?.code).toBe('if (false) reload();')
  expect(crxLiveReloadCompatibility(true).apply).toBe('serve')
})
it('다른 모듈과 이미 치환된 worker는 변경하지 않는다', () => {
  expect(replaceCrxLiveReload('__LIVE_RELOAD__', '/src/background/index.ts', true)).toBeNull()
  expect(replaceCrxLiveReload('if (true) reload();', '/@crx/client-worker', true)).toBeNull()
})
