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
  let listening = false;
  let request = 0;
  let owner: string | undefined;
  async function refresh() {
    if (!active || document.visibilityState === 'hidden') return;
    const id = ++request;
    try {
      const values = await chrome.storage.local.get([cacheKey, HISTORY_DISPLAY_KEY]);
      if (!active || id !== request) return;
      const enabled = isHistoryDisplayEnabled(values[HISTORY_DISPLAY_KEY]);
      const cache = enabled ? parseHistoryCache(values[cacheKey]) : null;
      owner = cache?.ownerKey;
      engine.update(cache, enabled);
    } catch { if (active && id === request) engine.update(null); }
  }
  function onChanged(changes: Record<string, chrome.storage.StorageChange>, area: string) {
    if (area !== 'local' || (!changes[cacheKey] && !changes[HISTORY_DISPLAY_KEY])) return;
    const next = changes[cacheKey]?.newValue;
    const nextOwner = next && typeof next === 'object' && 'ownerKey' in next ? next.ownerKey : undefined;
    if ((changes[cacheKey] && (!next || nextOwner !== owner))
      || (changes[HISTORY_DISPLAY_KEY] && !isHistoryDisplayEnabled(changes[HISTORY_DISPLAY_KEY].newValue))) engine.update(null);
    void refresh();
  }
  function subscribe(visible: boolean) {
    if (visible === listening) return;
    listening = visible;
    if (visible) chrome.storage.onChanged.addListener(onChanged);
    else chrome.storage.onChanged.removeListener(onChanged);
  }
  function suspend() {
    request++;
    owner = undefined;
    subscribe(false);
    engine.update(null); // 숨겨진 탭은 공고 Map과 DOM 참조도 보관하지 않는다.
    engine.setVisible(false);
  }
  function onVisibility() {
    if (document.visibilityState === 'hidden') { suspend(); return; }
    request++;
    owner = undefined;
    engine.update(null);
    engine.setVisible(true);
    subscribe(true);
    void refresh(); // 복귀 전에 최신 설정·계정 캐시를 다시 읽는다.
  }
  const onNavigation = () => engine.pageChanged();
  const stop = () => {
    active = false;
    request++;
    subscribe(false);
    engine.dispose();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('popstate', onNavigation);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
  };
  function onPageHide(event: PageTransitionEvent) {
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
