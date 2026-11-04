import { getPostingReference, type HistoryCache, type HistoryEntry } from '@jobdiary/shared';
import type { Platform } from '../types/application';
import { HISTORY_BADGE_CSS, HISTORY_BADGE_LABEL } from '../lib/historyBadgeStyle';
import { HISTORY_BADGE_SELECTORS } from './selectors/historyBadges';

type BadgeState = HistoryEntry['state'];
type SupportedPlatform = Exclude<Platform, 'wanted'>;
interface TrackedBadge { host: HTMLSpanElement; key: string; state: BadgeState; kind: 'link' | 'detail' }
export interface HistoryBadgeStats {
  visitedNodes: number; examinedLinks: number; flushes: number; maxSliceMs: number;
  liveBadges: number; queuedRoots: number; observing: boolean;
}

// 브라우저 API 외 의존성을 두지 않아 실제 content script와 DOM 테스트가 같은 엔진을 사용한다.
export function createHistoryAnnotator(
  doc: Document, platform: SupportedPlatform, getPageUrl = () => doc.location.href,
) {
  const view = doc.defaultView!;
  const tracked = new Map<Element, TrackedBadge>();
  const owned = new WeakSet<Node>();
  const expectedRemovals = new WeakSet<Node>();
  let insertions = new WeakMap<Element, { key: string; count: number; at: number }>();
  const roots = new Set<Element>();
  let walker: { root: Element; cursor: TreeWalker; first: boolean } | null = null;
  let index = new Map<string, BadgeState>();
  let enabled = true;
  let visible = doc.visibilityState !== 'hidden';
  let disposed = false;
  let running = false;
  let pruneNeeded = false;
  let detailDirty = true;
  let timer: number | undefined;
  let title = '';
  let pageUrl = getPageUrl();
  let sheet: CSSStyleSheet | undefined;
  const counters = { visitedNodes: 0, examinedLinks: 0, flushes: 0, maxSliceMs: 0 };

  function remove(target: Element, preserveAttempts = false) {
    if (!preserveAttempts) insertions.delete(target);
    const item = tracked.get(target);
    if (!item) return;
    expectedRemovals.add(item.host);
    item.host.remove();
    tracked.delete(target);
  }
  function clearBadges() { for (const target of tracked.keys()) remove(target); insertions = new WeakMap(); }
  function forgetWork() { view.clearTimeout(timer); timer = undefined; roots.clear(); walker = null; }

  function put(target: Element, key: string, state: BadgeState, kind: TrackedBadge['kind']) {
    const previous = tracked.get(target);
    if (previous?.host.parentElement === target && previous.key === key && previous.state === state) {
      previous.host.title = title;
      return;
    }
    if (previous && (previous.key !== key || previous.state !== state)) insertions.delete(target);
    remove(target, true);
    const now = Date.now();
    const attempts = insertions.get(target);
    if (attempts?.key === key && now - attempts.at < 5000 && attempts.count >= 3) return;
    insertions.set(target, attempts?.key === key && now - attempts.at < 5000
      ? { ...attempts, count: attempts.count + 1 } : { key, at: now, count: 1 });
    const host = doc.createElement('span');
    owned.add(host);
    host.dataset.jobdiaryHistory = kind;
    host.setAttribute('role', 'note');
    host.setAttribute('aria-label', '취준일기: ' + HISTORY_BADGE_LABEL[state]);
    host.title = title;
    // Shadow DOM의 텍스트는 부모의 textContent에 섞이지 않아 기존 수집 파서를 오염시키지 않는다.
    const shadow = host.attachShadow({ mode: 'closed' });
    if (typeof view.CSSStyleSheet?.prototype.replaceSync === 'function' && 'adoptedStyleSheets' in shadow) {
      sheet ??= new view.CSSStyleSheet();
      if (!sheet.cssRules.length) sheet.replaceSync(HISTORY_BADGE_CSS);
      shadow.adoptedStyleSheets = [sheet];
    } else {
      const style = doc.createElement('style');
      style.textContent = HISTORY_BADGE_CSS;
      shadow.append(style);
    }
    const label = doc.createElement('span');
    label.dataset.state = state;
    label.textContent = HISTORY_BADGE_LABEL[state];
    shadow.append(label);
    target.prepend(host);
    tracked.set(target, { host, key, state, kind });
  }
  function processLink(anchor: HTMLAnchorElement) {
    counters.examinedLinks++;
    const raw = anchor.getAttribute('href') ?? '';
    const looksLikePosting = platform === 'jobkorea' ? /\/recruit\/gi_read\//i.test(raw) : raw.includes('rec_idx=');
    if (!looksLikePosting || !anchor.textContent?.trim() || anchor.isContentEditable || anchor.closest('[contenteditable]:not([contenteditable="false"])')) { remove(anchor); return; }
    const reference = getPostingReference(anchor.href);
    const state = reference?.platform === platform ? index.get(reference.postingId) : undefined;
    if (!reference || !state) { remove(anchor); return; }
    put(anchor, reference.postingId, state, 'link');
  }
  function refreshDetail() {
    detailDirty = false;
    const reference = getPostingReference(getPageUrl());
    const state = reference?.platform === platform ? index.get(reference.postingId) : undefined;
    const headings = reference && state ? [...doc.querySelectorAll<HTMLElement>(HISTORY_BADGE_SELECTORS.heading)].filter(
      element => element.textContent?.trim() && !element.closest('a,button,[hidden],[aria-hidden="true"],[contenteditable]:not([contenteditable="false"])'),
    ) : [];
    const target = headings.length === 1 ? headings[0] : null;
    for (const [element, item] of tracked) if (item.kind === 'detail' && element !== target) remove(element);
    if (target && reference && state) put(target, reference.postingId, state, 'detail');
  }
  function schedule() {
    if (running && timer === undefined) timer = view.setTimeout(flush, 16);
  }
  function enqueue(root: Element) {
    if (!root.isConnected || owned.has(root)) return;
    const body = doc.body ?? doc.documentElement;
    if (root === body || roots.size >= 100) { roots.clear(); walker = null; roots.add(body); }
    else if (!roots.has(body)) roots.add(root);
    schedule();
  }
  function flush() {
    timer = undefined;
    if (!running) return;
    const start = view.performance.now();
    counters.flushes++;
    if (pageUrl !== getPageUrl()) { pageUrl = getPageUrl(); detailDirty = true; enqueue(doc.body ?? doc.documentElement); }
    if (pruneNeeded) {
      pruneNeeded = false;
      for (const [target, item] of tracked) {
        if (!target.isConnected) remove(target);
        else if (item.host.parentElement !== target) { remove(target, true); enqueue(target); }
      }
    }
    if (detailDirty) refreshDetail();
    let visited = 0;
    while (visited < 200 && view.performance.now() - start < 6) {
      if (!walker) {
        const root = roots.values().next().value as Element | undefined;
        if (!root) break;
        roots.delete(root);
        if (!root.isConnected) continue;
        walker = { root, first: true, cursor: doc.createTreeWalker(root, view.NodeFilter.SHOW_ELEMENT, {
          acceptNode: node => owned.has(node) ? view.NodeFilter.FILTER_REJECT : view.NodeFilter.FILTER_ACCEPT,
        }) };
      }
      if (!walker.root.isConnected) { walker = null; continue; }
      // body가 남아 있어도 cursor가 제거된 하위 트리를 가리킬 수 있다.
      if (!walker.cursor.currentNode.isConnected) { walker = null; enqueue(doc.body ?? doc.documentElement); continue; }
      const node = walker.first ? walker.root : walker.cursor.nextNode();
      walker.first = false;
      if (!node) { walker = null; continue; }
      visited++;
      counters.visitedNodes++;
      if (node instanceof view.HTMLAnchorElement && node.hasAttribute('href')) processLink(node);
    }
    counters.maxSliceMs = Math.max(counters.maxSliceMs, view.performance.now() - start);
    if (walker || roots.size || detailDirty || pruneNeeded) schedule();
  }
  const observer = new view.MutationObserver(records => {
    if (!running) return;
    let meaningful = false;
    for (const record of records) {
      if (owned.has(record.target)) continue;
      if (record.type === 'attributes') {
        enqueue(record.target instanceof view.HTMLBaseElement ? (doc.body ?? doc.documentElement) : record.target as Element);
        meaningful = true; continue;
      }
      if (record.type === 'characterData') {
        const target = record.target.parentElement?.closest('a[href],h1');
        if (target) { enqueue(target); meaningful = true; }
        continue;
      }
      for (const node of record.addedNodes) {
        if (owned.has(node)) continue;
        if (node instanceof view.Element) enqueue(node);
        else if (record.target instanceof view.Element) enqueue(record.target);
        meaningful = true;
      }
      for (const node of record.removedNodes) {
        if (expectedRemovals.delete(node)) continue;
        meaningful = true;
        pruneNeeded = true;
        if (walker && node.contains(walker.cursor.currentNode)) { walker = null; enqueue(doc.body ?? doc.documentElement); }
        if (owned.has(node) && record.target instanceof view.Element) enqueue(record.target);
      }
    }
    if (meaningful) { detailDirty = true; schedule(); }
  });
  function reconcile() {
    const next = !disposed && enabled && visible && index.size > 0;
    if (!next) {
      running = false;
      observer.disconnect();
      forgetWork();
      clearBadges();
      return;
    }
    if (!running) {
      running = true;
      observer.observe(doc.body ?? doc.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['href'] });
      detailDirty = true;
      enqueue(doc.body ?? doc.documentElement);
    }
  }
  return {
    update(cache: HistoryCache | null, nextEnabled = true) {
      enabled = nextEnabled;
      const nextIndex = new Map<string, BadgeState>();
      if (enabled) for (const entry of cache?.entries ?? []) if (entry.platform === platform) nextIndex.set(entry.postingId, entry.state);
      const changed = index.size !== nextIndex.size || [...nextIndex].some(([key, value]) => index.get(key) !== value);
      index = nextIndex;
      title = cache ? '취준일기 저장 이력 기준 · 마지막 동기화 ' + new Date(cache.syncedAt).toLocaleString('ko-KR') : '';
      if (changed) { forgetWork(); detailDirty = true; }
      reconcile();
      if (running && changed) {
        for (const target of tracked.keys()) {
          const item = tracked.get(target)!;
          const state = index.get(item.key);
          if (!state || state !== item.state) remove(target);
        }
        enqueue(doc.body ?? doc.documentElement);
      } else if (running) { for (const item of tracked.values()) item.host.title = title; }
    },
    setVisible(value: boolean) { visible = value; reconcile(); },
    pageChanged() { if (running) { detailDirty = true; enqueue(doc.body ?? doc.documentElement); } },
    dispose() { disposed = true; index.clear(); reconcile(); },
    getStats(): HistoryBadgeStats {
      return { ...counters, liveBadges: tracked.size, queuedRoots: roots.size + (walker ? 1 : 0), observing: running };
    },
  };
}
