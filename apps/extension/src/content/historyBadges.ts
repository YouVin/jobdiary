import { parseHistoryCache } from '@jobdiary/shared';
import { HISTORY_WEBAPP_ORIGIN, historyStorageKey } from '../lib/applicationHistory';
import { HISTORY_DISPLAY_KEY, isHistoryDisplayEnabled } from '../lib/historyDisplay';
import { detectHistoryPlatform } from '../lib/platformDetect';
import { createHistoryAnnotator } from './historyBadgeEngine';

const platform = detectHistoryPlatform(location.href);
if (platform) {
  const engine = createHistoryAnnotator(document, platform);
  const cacheKey = historyStorageKey(HISTORY_WEBAPP_ORIGIN);
  let active = true;
  let subscription: typeof chrome.storage.onChanged | undefined;
  let request = 0;
  let owner: string | undefined;

  // 재로드된 확장의 예전 content script에는 chrome 객체만 남고 API가 사라질 수 있다.
  function availableStorage() {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.id) return null;
      const storage = chrome.storage;
      return typeof storage?.local?.get === 'function' && typeof storage.onChanged?.addListener === 'function'
        && typeof storage.onChanged?.removeListener === 'function' ? storage : null;
    } catch { return null; }
  }
  function unsubscribe() {
    const event = subscription;
    subscription = undefined;
    // 전역 API를 다시 읽지 않고 등록에 사용한 이벤트로 해제한다.
    try { event?.removeListener(onChanged); } catch { /* 무효 컨텍스트여도 나머지 정리는 계속한다. */ }
  }
  function stop() {
    if (!active) return;
    active = false;
    request++;
    owner = undefined;
    unsubscribe();
    engine.dispose();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('popstate', onNavigation);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
  }
  async function refresh() {
    if (!active || document.visibilityState === 'hidden') return;
    const storage = availableStorage();
    if (!storage) { stop(); return; }
    const id = ++request;
    try {
      const values = await storage.local.get([cacheKey, HISTORY_DISPLAY_KEY]);
      if (!active || id !== request) return;
      if (!availableStorage()) { stop(); return; }
      const enabled = isHistoryDisplayEnabled(values[HISTORY_DISPLAY_KEY]);
      const cache = enabled ? parseHistoryCache(values[cacheKey]) : null;
      owner = cache?.ownerKey;
      engine.update(cache, enabled);
    } catch (error) {
      if (!active || id !== request) return;
      if (!availableStorage() || (error instanceof Error && error.message.includes('Extension context invalidated'))) stop();
      else engine.update(null);
    }
  }
  function onChanged(changes: Record<string, chrome.storage.StorageChange>, area: string) {
    if (!active || area !== 'local' || (!changes[cacheKey] && !changes[HISTORY_DISPLAY_KEY])) return;
    const next = changes[cacheKey]?.newValue;
    const nextOwner = next && typeof next === 'object' && 'ownerKey' in next ? next.ownerKey : undefined;
    if ((changes[cacheKey] && (!next || nextOwner !== owner))
      || (changes[HISTORY_DISPLAY_KEY] && !isHistoryDisplayEnabled(changes[HISTORY_DISPLAY_KEY].newValue))) engine.update(null);
    void refresh();
  }
  function subscribe() {
    if (subscription) return true;
    const storage = availableStorage();
    if (!storage) { stop(); return false; }
    try {
      const event = storage.onChanged;
      event.addListener(onChanged);
      subscription = event;
      return true;
    } catch { stop(); return false; }
  }
  function suspend() {
    request++;
    owner = undefined;
    unsubscribe();
    engine.update(null); // 숨겨진 탭은 공고 Map과 DOM 참조도 보관하지 않는다.
    engine.setVisible(false);
  }
  function onVisibility() {
    if (!active) return;
    if (!availableStorage()) { stop(); return; }
    if (document.visibilityState === 'hidden') { suspend(); return; }
    if (!subscribe()) return;
    request++;
    owner = undefined;
    engine.update(null);
    engine.setVisible(true);
    void refresh(); // 복귀 전에 최신 설정·계정 캐시를 다시 읽는다.
  }
  function onNavigation() {
    if (!active) return;
    if (!availableStorage()) { stop(); return; }
    engine.pageChanged();
  }
  function onPageHide(event: PageTransitionEvent) {
    if (!active) return;
    if (event.persisted) suspend();
    else stop();
  }
  function onPageShow() { onVisibility(); }
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('popstate', onNavigation);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  onVisibility();
}
