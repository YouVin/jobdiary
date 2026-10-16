import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';
import { createFormHarness } from './formHarness.mjs';

const snapshot = {
  id: 'row-1', company: 'synthetic', position: 'test', platform: 'manual', status: 'applied',
  statusSource: 'extension', appliedAt: '2020-01-01T00:00:00Z', deadlineAt: '2020-01-02', updatedAt: '2020-01-01T00:00:00Z',
};

function editor(initial = snapshot) {
  let row = { id: initial.id, user_id: 'user-1', status: initial.status, status_source: initial.statusSource, updated_at: initial.updatedAt };
  let writes = 0;
  let closes = 0;
  const busy = [];
  let changes;
  let filters;
  const query = {
    update(value) { changes = value; filters = []; return this; },
    eq(key, value) { filters.push([key, value]); return this; },
    select() { return this; },
    async single() {
      if (!row || !filters.every(([key, value]) => row[key] === value)) {
        return { data: null, error: { code: 'PGRST116', message: 'no matching row' } };
      }
      writes++;
      row = { ...row, ...changes };
      return { data: row, error: null };
    },
  };
  const load = createSourceLoader({ '@/lib/supabase': { supabase: {
    auth: { async getUser() { return { data: { user: { id: 'user-1' } }, error: null }; } },
    from: () => query,
  } } });
  const api = load('@/lib/applicationsApi');
  const state = {
    error: null,
    async updateApplication(id, updates, expectedUpdatedAt) {
      const result = await api.updateApplication(id, updates, { userId: 'user-1', isCurrent: () => true }, expectedUpdatedAt);
      state.error = result.error?.message ?? null;
      return !result.error;
    },
  };
  const props = { application: initial, isSubmitting: false, onClose: () => { closes++; }, onSubmittingChange: (value) => busy.push(value) };
  const form = createFormHarness('EditApplicationForm', props, state);
  return {
    form, state, props, busy,
    getRow: () => row,
    getWrites: () => writes,
    getCloses: () => closes,
    setRow: (value) => { row = value; },
  };
}

test('오래된 편집창은 다른 탭에서 수동 복원한 지원완료를 자동 탈락으로 덮어쓰지 않는다', async () => {
  const e = editor();
  e.setRow({ ...e.getRow(), status_source: 'manual', updated_at: '2020-01-03T00:00:00Z' });
  await e.form.save();
  assert.equal(e.getRow().status, 'applied');
  assert.equal(e.getRow().status_source, 'manual');
  assert.equal(e.getWrites(), 0);
  assert.equal(e.getCloses(), 0);
  assert.match(e.state.error, /새로고침/);
  assert.deepEqual(e.busy, [true, false]);
});

test('편집 중 props가 최신으로 바뀌어도 오래된 입력값의 기준 버전은 유지한다', async () => {
  const e = editor();
  const latest = { ...snapshot, status: 'screening', statusSource: 'manual', updatedAt: '2020-01-03T00:00:00Z' };
  e.setRow({ ...e.getRow(), status: latest.status, status_source: latest.statusSource, updated_at: latest.updatedAt });
  e.form.render({ ...e.props, application: latest });
  await e.form.save();
  assert.equal(e.getWrites(), 0);
  assert.equal(e.getRow().status, 'screening');
  assert.match(e.state.error, /새로고침/);
});

test('삭제된 지원을 저장하면 수정창을 유지하고 새로고침을 안내한다', async () => {
  const e = editor();
  e.setRow(null);
  await e.form.save();
  assert.equal(e.getWrites(), 0);
  assert.equal(e.getCloses(), 0);
  assert.match(e.state.error, /삭제/);
});

test('최신 버전의 마감 지난 지원은 정상적으로 자동 분류하고 저장한다', async () => {
  const e = editor();
  await e.form.save();
  assert.equal(e.getWrites(), 1);
  assert.equal(e.getCloses(), 1);
  assert.equal(e.getRow().status, 'rejected');
  assert.equal(e.getRow().status_source, 'deadline');
});

test('사용자가 직접 지원완료로 복원하면 지난 마감일이 있어도 수동 상태로 저장한다', async () => {
  const e = editor({ ...snapshot, status: 'rejected', statusSource: 'deadline' });
  e.form.fields().onStatusChange('applied');
  e.form.render();
  await e.form.save();
  assert.equal(e.getWrites(), 1);
  assert.equal(e.getRow().status, 'applied');
  assert.equal(e.getRow().status_source, 'manual');
});
