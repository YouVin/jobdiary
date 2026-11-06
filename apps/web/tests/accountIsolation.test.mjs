import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

const session = (id) => ({ user: { id }, access_token: `synthetic-${id}` });
const application = { id: 'row-A', company: 'synthetic', position: 'test', platform: 'manual', status: 'applied', appliedAt: '2026-10-01' };

function fixture(api = {}, extraMocks = {}) {
  const load = createSourceLoader({
    '@/lib/storage': { saveApplications() {} },
    '@/lib/applicationsApi': {
      async rejectExpiredApplications() { return { applications: [], error: null }; },
      async fetchApplications() { return { applications: [], error: null }; },
      ...api,
    },
    ...extraMocks,
  });
  const { useApplicationStore: store, captureApplicationSession: capture } = load('@/store/applicationStore');
  const auth = load('@/store/authStore').useAuthStore;
  auth.getState().setSession(session('A'));
  return { load, store, auth, capture };
}

test('로그아웃 뒤 늦게 도착한 조회는 이전 데이터를 되살리지 않는다', async () => {
  const started = deferred();
  const response = deferred();
  const { store, auth } = fixture({ async fetchApplications() { started.resolve(); return response.promise; } });
  const pending = store.getState().loadApplications();
  await started.promise;
  auth.getState().setSession(null);
  response.resolve({ applications: [application], error: null });
  await pending;
  assert.deepEqual(store.getState().applications, []);
  assert.equal(store.getState().userId, null);
  assert.equal(store.getState().isLoading, false);
});

test('A에서 B로 바뀐 뒤 B 조회가 실패해도 A의 내역을 표시하지 않는다', async () => {
  const { store, auth } = fixture({ async fetchApplications() { return { applications: [], error: new Error('B fetch failed') }; } });
  store.setState({ applications: [application], error: 'A error' });
  auth.getState().setSession(session('B'));
  assert.deepEqual(store.getState().applications, []);
  assert.equal(store.getState().error, null);
  await store.getState().loadApplications();
  assert.deepEqual(store.getState().applications, []);
  assert.equal(store.getState().error, 'B fetch failed');
});

test('같은 계정의 토큰 갱신은 상태를 보존하지만 재로그인은 새 세대다', () => {
  const { store, auth, capture } = fixture();
  store.setState({ applications: [application] });
  const first = capture();
  const version = store.getState().sessionVersion;
  auth.getState().setSession({ ...session('A'), access_token: 'refreshed' });
  assert.equal(first.isCurrent(), true);
  assert.equal(store.getState().sessionVersion, version);
  assert.deepEqual(store.getState().applications, [application]);
  auth.getState().setSession(null);
  auth.getState().setSession(session('A'));
  assert.equal(first.isCurrent(), false);
  assert.deepEqual(store.getState().applications, []);
});

test('잠금 대기 중 계정이 바뀌면 신규 저장은 DB 호출 전에 취소한다', async () => {
  const started = deferred();
  const response = deferred();
  let inserts = 0;
  const { store, auth } = fixture({
    async fetchApplications() { started.resolve(); return response.promise; },
    async insertApplication() { inserts++; return { application, error: null }; },
  });
  const reading = store.getState().loadApplications();
  await started.promise;
  const writing = store.getState().addApplication(application);
  auth.getState().setSession(session('B'));
  response.resolve({ applications: [application], error: null });
  await reading;
  assert.equal(await writing, false);
  assert.equal(inserts, 0);
});

for (const method of ['addApplication', 'updateApplication', 'removeApplication']) {
  for (const failed of [false, true]) {
    test(`${method}: 이전 계정의 늦은 ${failed ? '실패' : '성공'} 응답을 새 계정에 반영하지 않는다`, async () => {
      const started = deferred();
      const response = deferred();
      const apiName = { addApplication: 'insertApplication', updateApplication: 'updateApplication', removeApplication: 'deleteApplication' }[method];
      const { store, auth } = fixture({ [apiName]: async (...args) => {
        assert.equal(args[method === 'updateApplication' ? 2 : 1].userId, 'A');
        started.resolve();
        return response.promise;
      } });
      const args = { addApplication: [application], updateApplication: ['row-A', { company: 'changed' }], removeApplication: ['row-A'] }[method];
      const pending = store.getState()[method](...args);
      await started.promise;
      auth.getState().setSession(session('B'));
      store.setState({ applications: [{ ...application, id: 'row-B' }], error: 'B state' });
      response.resolve({ application, error: failed ? new Error('A error') : null });
      assert.equal(await pending, false);
      assert.equal(store.getState().applications[0].id, 'row-B');
      assert.equal(store.getState().error, 'B state');
    });
  }
}

test('가져오기 조회 중 계정 변경 시 다른 계정에 일괄 저장하지 않는다', async () => {
  const started = deferred();
  const response = deferred();
  let inserts = 0;
  const { store, auth } = fixture({
    async fetchApplications() { started.resolve(); return response.promise; },
    async insertApplications() { inserts++; return { applications: [application], error: null }; },
  });
  const pending = store.getState().addApplicationsFromExtension([application]);
  await started.promise;
  auth.getState().setSession(session('B'));
  response.resolve({ applications: [], error: null });
  const summary = await pending;
  assert.equal(summary.addedCount, 0);
  assert.ok(summary.error);
  assert.equal(inserts, 0);
});

test('복구 세션 진입은 지원 상태를 격리하고 로그아웃을 정상 반영한다', () => {
  const { store, auth, capture } = fixture();
  const previous = capture();
  auth.getState().setRecovering(session('A'));
  assert.equal(store.getState().userId, null);
  assert.equal(previous.isCurrent(), false);
  auth.getState().setSession(session('A'));
  assert.equal(auth.getState().status, 'recovering');
  auth.getState().setSession(null);
  assert.equal(auth.getState().status, 'unauthenticated');
  auth.getState().setSession(session('B'));
  assert.equal(auth.getState().status, 'authenticated');
  assert.equal(store.getState().userId, 'B');
});

test('로그아웃 상태의 작업은 요청을 보내지 않는다', async () => {
  let calls = 0;
  const { store, auth } = fixture({ async insertApplication() { calls++; return { application, error: null }; } });
  auth.getState().setSession(null);
  assert.equal(await store.getState().addApplication(application), false);
  assert.equal(calls, 0);
});

test('이미 보낸 일괄 저장의 늦은 성공 응답은 새 계정에 반영하지 않는다', async () => {
  const started = deferred();
  const response = deferred();
  const { store, auth } = fixture({
    async insertApplications(_apps, context) { assert.equal(context.userId, 'A'); started.resolve(); return response.promise; },
  });
  const pending = store.getState().addApplicationsFromExtension([application]);
  await started.promise;
  auth.getState().setSession(session('B'));
  response.resolve({ applications: [application], error: null });
  assert.equal((await pending).addedCount, 0);
  assert.deepEqual(store.getState().applications, []);
});

for (const newerEvent of ['SIGNED_OUT', 'SIGNED_IN', 'PASSWORD_RECOVERY', 'cleanup']) {
  test(`인증 초기 복원의 지연 응답은 ${newerEvent} 이후 상태를 덮어쓰지 않는다`, async () => {
    const response = deferred();
    let listener;
    let unsubscribed = false;
    const { load, auth } = fixture({}, {
      '@/lib/auth': {
        getSession: () => response.promise,
        onAuthStateChange: (callback) => { listener = callback; return () => { unsubscribed = true; }; },
      },
    });
    const stop = load('@/lib/authSync').startAuthSync();
    if (newerEvent === 'cleanup') stop();
    else listener(newerEvent, newerEvent === 'SIGNED_OUT' ? null : session('B'));
    response.resolve({ session: session('A'), error: null });
    await new Promise((resolve) => setImmediate(resolve));
    if (newerEvent === 'SIGNED_OUT') assert.equal(auth.getState().session, null);
    else assert.equal(auth.getState().session.user.id, newerEvent === 'cleanup' ? 'A' : 'B');
    if (newerEvent === 'PASSWORD_RECOVERY') assert.equal(auth.getState().status, 'recovering');
    stop();
    assert.equal(unsubscribed, true);
  });
}

test('익스텐션 수집 응답 대기 중 계정이 바뀌면 저장하지 않는다', async () => {
  let reply;
  let inserts = 0;
  const previousChrome = globalThis.chrome;
  globalThis.chrome = { runtime: { sendMessage(_id, _message, callback) { reply = callback; } } };
  try {
    const { store, auth, capture } = fixture({ async insertApplications() { inserts++; return { applications: [], error: null }; } });
    const load = createSourceLoader({
      '@/store/applicationStore': { captureApplicationSession: capture, useApplicationStore: (selector) => selector(store.getState()) },
      '@/store/authStore': { useAuthStore: auth },
      react: {
        useState: (value) => [value, () => {}],
        useCallback: (callback) => callback,
        useSyncExternalStore: (_subscribe, read) => read(),
      },
    });
    const pending = load('@/hooks/useExtensionImport').useExtensionImport().requestImport();
    auth.getState().setSession(session('B'));
    reply({ ok: true, applications: [application] });
    await pending;
    assert.equal(inserts, 0);
  } finally {
    if (previousChrome === undefined) delete globalThis.chrome;
    else globalThis.chrome = previousChrome;
  }
});

test('API는 인증 확인 중의 계정 변경을 검출하고 다른 계정으로 쓰지 않는다', async () => {
  const authResponse = deferred();
  let current = true;
  let queries = 0;
  const source = createSourceLoader({ '@/lib/supabase': { supabase: {
    auth: { getUser: () => authResponse.promise },
    from() { queries++; throw new Error('must not query'); },
  } } });
  const api = source('@/lib/applicationsApi');
  const context = { userId: 'A', isCurrent: () => current };
  const pending = api.insertApplication(application, context);
  current = false;
  authResponse.resolve({ data: { user: { id: 'B' } }, error: null });
  assert.ok((await pending).error);
  assert.equal(queries, 0);
  current = true;
  assert.ok((await api.insertApplication(application, context)).error);
  assert.equal(queries, 0);
});

test('수정·삭제 DB 쿼리는 시작 계정의 user_id로 제한한다', async () => {
  const filters = [];
  const query = {
    update() { return this; }, delete() { return this; },
    eq(key, value) { filters.push([key, value]); return this; },
    select() { return this; },
    async single() { return { data: application, error: null }; },
    then(resolve) { return Promise.resolve({ data: [application], error: null }).then(resolve); },
  };
  const source = createSourceLoader({ '@/lib/supabase': { supabase: {
    auth: { async getUser() { return { data: { user: { id: 'A' } }, error: null }; } },
    from: () => query,
  } } });
  const api = source('@/lib/applicationsApi');
  const context = { userId: 'A', isCurrent: () => true };
  await api.updateApplication('row-A', { company: 'changed' }, context);
  await api.deleteApplication('row-A', context);
  assert.deepEqual(filters, [['id', 'row-A'], ['user_id', 'A'], ['id', 'row-A'], ['user_id', 'A']]);
});
