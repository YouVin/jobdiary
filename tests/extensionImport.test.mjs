import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

const load = createSourceLoader();
const { buildExtensionImportPlan: plan } = load('@/utils/extensionImportPlan');
const { sanitizeCollectResponse } = load('@/lib/extensionImport');
const incoming = (changes = {}) => ({
  company: '회사', position: '개발자', platform: 'jobkorea', status: 'applied',
  appliedAt: '2026-09-30T00:00:00.000Z', externalId: 'submission-1', ...changes,
});
const saved = (changes = {}) => ({
  ...incoming(), id: 'saved-1', updatedAt: '2026-10-01T00:00:00.000Z', statusSource: 'extension', ...changes,
});

test('같은 지원의 반복 수집은 추가/갱신하지 않는다', () => {
  const result = plan([saved()], [incoming(), incoming()]);
  assert.equal(result.toInsert.length, 0);
  assert.equal(result.toUpdate.length, 0);
  assert.equal(result.skippedCount, 2);
});

test('지원 ID가 같으면 제목 변경도 기존 ID에 갱신한다', () => {
  const result = plan([saved()], [incoming({ company: '새 회사명', position: '새 공고명' })]);
  assert.equal(result.toInsert.length, 0);
  assert.equal(result.toUpdate[0].id, 'saved-1');
  assert.equal(result.toUpdate[0].changes.position, '새 공고명');
});

test('ID가 없어도 공백/줄바꿈 차이를 정규화하여 같은 공고를 찾는다', () => {
  const result = plan([saved({ position: '프론트엔드 개발자', externalId: undefined })], [
    incoming({ position: ' 프론트엔드\n 개발자 ', externalId: undefined }),
  ]);
  assert.equal(result.toInsert.length, 0);
  assert.equal(result.skippedCount, 1);
});

test('수동 탈락과 메모/일기는 수집 내용이 바뀌어도 UPDATE 대상에서 제외한다', () => {
  const result = plan([saved({ status: 'rejected', statusSource: 'manual', memo: '메모', diary: [{ id: 'diary-1' }] })], [
    incoming({ position: '수정 공고명' }),
  ]);
  assert.equal(result.toUpdate.length, 1);
  for (const field of ['status', 'statusSource', 'memo', 'diary', 'interviewDate']) {
    assert.equal(Object.hasOwn(result.toUpdate[0].changes, field), false);
  }
});

test('수동 상태는 모든 단계에서 보호하고, 기존 출처 없는 탈락도 보호한다', () => {
  for (const status of ['applied', 'screening', 'interview', 'interviewed', 'offer', 'rejected', 'canceled']) {
    const result = plan([saved({ status, statusSource: 'manual' })], [incoming({ status: 'canceled' })]);
    assert.equal(result.toUpdate.length, 0);
    assert.equal(result.toInsert.length, 0);
  }
  assert.equal(plan([saved({ status: 'rejected', statusSource: undefined })], [incoming()]).skippedCount, 1);
});

test('수집 상태는 계속 자동 갱신하고 수동 출처를 익스텐션이 주입할 수 없다', () => {
  const result = plan([saved()], [incoming({ status: 'rejected' })]);
  assert.equal(result.toUpdate[0].changes.status, 'rejected');
  assert.equal(result.toUpdate[0].changes.statusSource, 'extension');
  const sanitized = sanitizeCollectResponse({ ok: true, applications: [incoming({ statusSource: 'manual', memo: '주입' })] });
  assert.equal(sanitized.ok, true);
  assert.equal(Object.hasOwn(sanitized.applications[0], 'statusSource'), false);
  assert.equal(Object.hasOwn(sanitized.applications[0], 'memo'), false);
});

test('한 배치 내 신규 지원→취소는 최종 내용 한 건을 삽입하고 임시 ID를 갱신하지 않는다', () => {
  const result = plan([], [incoming(), incoming({ status: 'canceled', externalId: 'cancel-1', appliedAt: '2026-10-01' })]);
  assert.equal(result.toInsert.length, 1);
  assert.equal(result.toInsert[0].status, 'canceled');
  assert.equal(result.toInsert[0].externalId, 'cancel-1');
  assert.equal(result.toUpdate.length, 0);
  assert.equal(result.addedCount, 1);
});

test('같은 기존 공고에 대한 갱신을 합치고 오래된 지원 행은 최신 취소를 되돌리지 않는다', () => {
  const result = plan([saved()], [
    incoming({ status: 'canceled', externalId: 'cancel-1', appliedAt: '2026-10-01' }), incoming(),
  ]);
  assert.equal(result.toUpdate.length, 1);
  assert.equal(result.toUpdate[0].changes.status, 'canceled');
  assert.equal(result.skippedCount, 1);
});

test('수집 ID가 누락되어도 기존 ID는 지우지 않는다', () => {
  const result = plan([saved()], [incoming({ status: 'canceled', externalId: undefined })]);
  assert.equal(result.toUpdate[0].changes.externalId, 'submission-1');
});

test('다른 플랫폼 지원은 별도 건으로 남긴다', () => {
  const result = plan([saved()], [incoming({ platform: 'saramin' })]);
  assert.equal(result.toInsert.length, 1);
  assert.equal(result.duplicateCount, 1);
});

test('잘못된 날짜는 저장 전에 거부한다', () => {
  assert.equal(sanitizeCollectResponse({ ok: true, applications: [incoming({ appliedAt: '날짜 아님' })] }), null);
});

function createStore(initial = [], fetchError = null) {
  let rows = structuredClone(initial);
  const calls = { inserts: 0, updates: 0, fetches: 0 };
  const api = {
    async fetchApplications() {
      calls.fetches++;
      await new Promise((resolve) => setImmediate(resolve));
      return { applications: structuredClone(rows), error: fetchError };
    },
    async insertApplications(apps) {
      calls.inserts += apps.length;
      const applications = apps.map((app) => saved({ ...app, id: crypto.randomUUID() }));
      rows.push(...applications);
      return { applications, error: null };
    },
    async updateApplication(id, changes) {
      calls.updates++;
      const row = rows.find((app) => app.id === id);
      assert.ok(row, 'DB에 없는 임시 ID를 갱신해서는 안 된다');
      Object.assign(row, changes);
      if (changes.status !== undefined) row.statusSource = changes.statusSource ?? 'manual';
      return { application: structuredClone(row), error: null };
    },
  };
  const source = createSourceLoader({ '@/lib/applicationsApi': api, '@/lib/storage': { saveApplications() {} } });
  return { store: source('@/store/applicationStore').useApplicationStore, calls, getRows: () => rows };
}

test('빈 스토어에서 자동 가져오기해도 DB의 기존 지원을 재삽입하지 않는다', async () => {
  const { store, calls } = createStore([saved()]);
  const result = await store.getState().addApplicationsFromExtension([incoming()]);
  assert.equal(result.addedCount, 0);
  assert.equal(calls.inserts, 0);
  assert.equal(store.getState().applications.length, 1);
});

test('초기 조회와 가져오기 두 번이 겹쳐도 한 건만 저장한다', async () => {
  const { store, calls, getRows } = createStore();
  await Promise.all([
    store.getState().loadApplications(),
    store.getState().addApplicationsFromExtension([incoming()]),
    store.getState().addApplicationsFromExtension([incoming()]),
  ]);
  assert.equal(calls.inserts, 1);
  assert.equal(getRows().length, 1);
  assert.equal(store.getState().applications.length, 1);
});

test('DB 조회 실패 시 빈 목록으로 간주해 삽입하지 않는다', async () => {
  const { store, calls } = createStore([], new Error('조회 실패'));
  const result = await store.getState().addApplicationsFromExtension([incoming()]);
  assert.equal(result.error, '조회 실패');
  assert.equal(calls.inserts, 0);
  assert.equal(calls.updates, 0);
});

test('탈락으로 수동 이동 후 다시 로드하고 수집해도 탈락과 일기를 유지한다', async () => {
  const diary = [{ id: 'diary-1', content: '면접 기록', createdAt: '2026-10-01' }];
  const { store, getRows } = createStore([saved({ diary })]);
  await store.getState().loadApplications();
  await store.getState().updateStatus('saved-1', 'rejected');
  store.setState({ applications: [] });
  await store.getState().addApplicationsFromExtension([incoming({ position: '공고명 수정' })]);
  assert.equal(getRows()[0].status, 'rejected');
  assert.equal(getRows()[0].statusSource, 'manual');
  assert.deepEqual(getRows()[0].diary, diary);
  assert.equal(store.getState().applications[0].position, '공고명 수정');
});

test('API는 상태 변경 주체를 DB에 저장하고 읽어 온다', async () => {
  let write;
  const row = {
    id: 'saved-1', company: '회사', position: '개발자', platform: 'jobkorea', status: 'rejected',
    status_source: 'manual', applied_at: '2026-09-30', updated_at: '2026-10-01',
  };
  const query = {
    update(value) { write = value; return this; }, eq() { return this; }, select() { return this; },
    async single() { return { data: { ...row, ...write }, error: null }; },
  };
  const source = createSourceLoader({ '@/lib/supabase': { supabase: { from: () => query } } });
  const { updateApplication } = source('@/lib/applicationsApi');
  const result = await updateApplication('saved-1', { status: 'rejected' });
  assert.equal(write.status_source, 'manual');
  assert.equal(result.application.statusSource, 'manual');
  await updateApplication('saved-1', { status: 'canceled', statusSource: 'extension' });
  assert.equal(write.status_source, 'extension');
  await updateApplication('saved-1', { company: '새 이름' });
  assert.equal(Object.hasOwn(write, 'status_source'), false);
});
