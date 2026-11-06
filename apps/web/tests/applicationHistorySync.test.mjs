import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';
const wait = async predicate => {
  for (let i = 0; i < 150; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  assert.fail('동기화 결과 대기 시간 초과');
};
const app = { id: 'saved', company: '보내지 않을 회사', position: '보내지 않을 공고명', platform: 'jobkorea', status: 'applied',
  url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/101', appliedAt: '2026-11-01', updatedAt: '2026-11-01T00:00:00Z', memo: 'secret', diary: ['secret'] };
function fixture(t, custom = {}) {
  const oldChrome = globalThis.chrome;
  const calls = [];
  let database = [app];
  const load = createSourceLoader({
    '@/lib/storage': { saveApplications() {} },
    '@/lib/applicationsApi': {
      rejectExpiredApplications: async () => ({ applications: [], error: null }),
      fetchApplications: async () => ({ applications: database, error: null }),
      fetchApplicationHistory: async context => custom.fetchApplications ? custom.fetchApplications(context) : ({ applications: database, error: null }),
      insertApplication: async value => {
        const added = { ...value, id: 'added' }; database = [...database, added];
        return { application: added, error: null };
      },
      updateApplication: async (id, changes) => {
        const updated = { ...database.find(value => value.id === id), ...changes };
        database = database.map(value => value.id === id ? updated : value);
        return { application: updated, error: null };
      },
      deleteApplication: async id => { database = database.filter(value => value.id !== id); return { error: null }; },
      ...custom,
    },
  });
  const store = load('@/store/applicationStore').useApplicationStore;
  const auth = load('@/store/authStore').useAuthStore;
  const sync = load('@/lib/applicationHistorySync');
  const session = id => ({ user: { id }, access_token: 'never-send-token' });
  globalThis.chrome = { runtime: { sendMessage(_id, request, reply) {
    calls.push(structuredClone(request));
    reply({ ok: true, version: 1, entryCount: request.snapshot?.entries.length ?? 0, syncedAt: new Date().toISOString() });
  } } };
  auth.getState().setSession(session('A'));
  const stop = sync.startApplicationHistorySync({ debounceMs: 0, retryDelays: [] });
  t.after(() => { stop(); if (oldChrome === undefined) delete globalThis.chrome; else globalThis.chrome = oldChrome; });
  return { load, store, auth, sync, session, calls, stop };
}
test('완전한 조회 전에는 빈 snapshot을 보내지 않고 조회 후 최소 정보만 보낸다', async t => {
  const { store, calls, sync } = fixture(t);
  await wait(() => calls.length > 0);
  assert.equal(calls[0].type, 'JOBDIARY_HISTORY_CLEAR');
  assert.equal(calls.filter(item => item.snapshot).length, 0);
  await store.getState().loadApplications();
  await wait(() => calls.some(item => item.snapshot));
  const request = calls.find(item => item.snapshot);
  assert.equal(request.snapshot.ownerKey.length, 64);
  assert.deepEqual(request.snapshot.entries, [{ platform: 'jobkorea', postingId: '101', state: 'applied' }]);
  assert.equal(JSON.stringify(request).includes('secret'), false);
  assert.equal(JSON.stringify(request).includes('never-send-token'), false);
  assert.equal(JSON.stringify(request).includes('보내지 않을'), false);
  assert.equal(sync.getApplicationHistorySyncStatus().state, 'synced');
});
test('추가·상태 변경·삭제 성공 뒤 전체 캐시를 교체한다', async t => {
  const { store, calls } = fixture(t);
  await store.getState().loadApplications();
  await wait(() => calls.some(item => item.snapshot));
  await store.getState().addApplication({ ...app, url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/102' });
  await wait(() => calls.at(-1).snapshot?.entries.length === 2);
  await store.getState().updateStatus('saved', 'canceled');
  await wait(() => calls.at(-1).snapshot?.entries.find(item => item.postingId === '101')?.state === 'canceled');
  await store.getState().removeApplication('saved');
  await wait(() => calls.at(-1).snapshot?.entries.length === 1);
  assert.equal(calls.at(-1).snapshot.entries[0].postingId, '102');
});
test('같은 계정 토큰 갱신은 캐시를 비우지 않고 로그아웃은 수집과 별도로 정리한다', async t => {
  const { store, calls, auth, session } = fixture(t);
  await store.getState().loadApplications();
  await wait(() => calls.some(item => item.snapshot));
  const count = calls.length;
  auth.getState().setSession({ ...session('A'), access_token: 'refreshed' });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(calls.length, count);
  auth.getState().setSession(null);
  await wait(() => calls.at(-1).type === 'JOBDIARY_HISTORY_CLEAR');
  assert.equal(store.getState().historyReady, false);
});
test('조회 실패를 미지원 전체 목록으로 보내지 않는다', async t => {
  const { store, calls } = fixture(t, { fetchApplications: async () => ({ applications: [], error: new Error('offline') }) });
  await store.getState().loadApplications();
  await wait(() => calls.length > 0);
  assert.equal(calls.some(item => item.snapshot), false);
});
test('계정 전환 때 이전 응답 대기 중이어도 새 계정 clear·snapshot 순서로 정리한다', async t => {
  const { store, calls, auth, session } = fixture(t);
  let release;
  const originalSend = chrome.runtime.sendMessage;
  chrome.runtime.sendMessage = (id, request, reply) => {
    if (request.type === 'JOBDIARY_HISTORY_SYNC' && !release) {
      calls.push(structuredClone(request));
      release = () => reply({ ok: true, version: 1, entryCount: 1, syncedAt: new Date().toISOString() });
    } else originalSend(id, request, reply);
  };
  await store.getState().loadApplications();
  await wait(() => release);
  auth.getState().setSession(session('B'));
  await store.getState().loadApplications();
  release();
  await wait(() => calls.filter(item => item.snapshot).length === 2);
  assert.equal(calls.at(-2).type, 'JOBDIARY_HISTORY_CLEAR');
  assert.notEqual(calls[1].snapshot.ownerKey, calls.at(-1).snapshot.ownerKey);
});
test('미설치/구버전 응답은 웹앱 조회·저장을 실패시키지 않는다', async t => {
  const { store, sync } = fixture(t);
  chrome.runtime.sendMessage = (_id, _request, reply) => reply(undefined);
  await store.getState().loadApplications();
  await wait(() => sync.getApplicationHistorySyncStatus().state === 'unavailable');
  assert.equal(store.getState().applications.length, 1);
  assert.equal(store.getState().error, null);
  assert.equal(await store.getState().addApplication(app), true);
});
test('웹앱 구독 종료는 이미 전송한 캐시를 삭제하지 않는다', async t => {
  const { store, calls, stop } = fixture(t);
  await store.getState().loadApplications();
  await wait(() => calls.some(item => item.snapshot));
  stop();
  const count = calls.length;
  store.getState().resetApplications();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(calls.length, count);
});
test('기존 지원 주소 보완은 버전 조건과 URL만 쓰고 수동 상태·메모를 유지한다', async t => {
  const existing = { ...app, url: undefined, externalId: 'apply-101', status: 'interview', statusSource: 'manual' };
  let write;
  const { store } = fixture(t, {
    fetchApplications: async () => ({ applications: [existing], error: null }),
    updateApplication: async (id, changes, context, expectedUpdatedAt) => {
      write = { id, changes, userId: context.userId, expectedUpdatedAt };
      return { application: { ...existing, ...changes }, error: null };
    },
  });
  const summary = await store.getState().addApplicationsFromExtension([{ ...app, externalId: 'apply-101' }]);
  assert.deepEqual(write, { id: 'saved', changes: { url: app.url }, userId: 'A', expectedUpdatedAt: existing.updatedAt });
  assert.equal(summary.skippedCount, 1);
  assert.equal(store.getState().applications[0].status, 'interview');
  assert.equal(store.getState().applications[0].memo, 'secret');
});

test('주소 보완 중 수정 충돌이 나면 신규 삽입을 중단하고 기존 상태를 보존한다', async t => {
  const existing = { ...app, url: undefined, externalId: 'apply-101', status: 'interview', statusSource: 'manual' };
  let inserts = 0;
  const { store } = fixture(t, {
    fetchApplications: async () => ({ applications: [existing], error: null }),
    updateApplication: async () => ({ application: null, error: new Error('수정 충돌') }),
    insertApplications: async () => { inserts++; return { applications: [], error: null }; },
  });
  const summary = await store.getState().addApplicationsFromExtension([{ ...app, externalId: 'apply-101' }]);
  assert.equal(summary.error, '수정 충돌');
  assert.equal(inserts, 0);
  assert.equal(store.getState().applications[0].status, 'interview');
  assert.equal(store.getState().applications[0].url, undefined);
});
test('주소 보완 응답이 늦게 와도 다른 계정의 이력으로 반영하지 않는다', async t => {
  const existing = { ...app, url: undefined, externalId: 'apply-101' };
  let release;
  const { store, auth, session } = fixture(t, {
    fetchApplications: async () => ({ applications: [existing], error: null }),
    updateApplication: () => new Promise(resolve => { release = () => resolve({ application: { ...existing, url: app.url }, error: null }); }),
  });
  const pending = store.getState().addApplicationsFromExtension([{ ...app, externalId: 'apply-101' }]);
  await wait(() => release);
  auth.getState().setSession(session('B'));
  release();
  assert.ok((await pending).error);
  assert.equal(store.getState().userId, 'B');
  assert.deepEqual(store.getState().applications, []);
});

test('오래된 탭의 메모리가 최신 DB 공고 주소를 되돌리지 않는다', async t => {
  let database = [app];
  const { store, calls } = fixture(t, { fetchApplications: async () => ({ applications: database, error: null }) });
  await store.getState().loadApplications();
  await wait(() => calls.some(item => item.snapshot));
  database = [{ ...app, url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/102' }];
  const count = calls.length;
  store.setState({ applications: [...store.getState().applications] });
  await wait(() => calls.length > count);
  assert.equal(calls.at(-1).snapshot.entries[0].postingId, '102');
});

test('전송 직전 DB 조회 실패는 기존 비교 목록을 빈 목록으로 교체하지 않는다', async t => {
  let fail = false;
  const { store, calls, sync } = fixture(t, { fetchApplications: async () => fail
    ? ({ applications: [], error: new Error('offline') }) : ({ applications: [app], error: null }) });
  await store.getState().loadApplications();
  await wait(() => calls.some(item => item.snapshot));
  const before = calls.length;
  fail = true;
  store.setState({ applications: [...store.getState().applications] });
  await wait(() => sync.getApplicationHistorySyncStatus().state === 'error');
  assert.equal(calls.length, before);
  assert.equal(calls.at(-1).snapshot.entries[0].postingId, '101');
});

test('이전 계정의 늦은 DB 응답은 새 계정의 비교 목록에 반영하지 않는다', async t => {
  let readsA = 0;
  let release;
  const { store, calls, auth, session } = fixture(t, {
    fetchApplications: async context => {
      if (context.userId === 'A' && ++readsA === 2) return new Promise(resolve => {
        release = () => resolve({ applications: [app], error: null });
      });
      return { applications: [{ ...app, url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/202' }], error: null };
    },
  });
  await store.getState().loadApplications();
  await wait(() => release);
  auth.getState().setSession(session('B'));
  await store.getState().loadApplications();
  release();
  await wait(() => calls.some(item => item.snapshot));
  assert.equal(calls.filter(item => item.snapshot).length, 1);
  assert.equal(calls.at(-1).snapshot.entries[0].postingId, '202');
});
