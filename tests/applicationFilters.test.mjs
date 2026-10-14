import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

const load = createSourceLoader();
const { filterApplications, DEFAULT_APPLICATION_FILTERS } = load('@/utils/applicationFilters');
const { getDuplicateApplicationIds } = load('@/utils/duplicateDetection');
const row = (id, changes = {}) => ({ id, company: '테스트 회사', position: 'Frontend Engineer', platform: 'saramin', status: 'applied', appliedAt: '2026-10-14', ...changes });
const filter = (rows, changes) => filterApplications(rows, { ...DEFAULT_APPLICATION_FILTERS, ...changes });

test('검색은 회사명/공고명과 대소문자·공백·유니코드를 정규화한다', () => {
  const rows = [row('a', { company: '테스트  회사' }), row('b', { company: '다른회사', position: '디자이너' })];
  assert.deepEqual(filter(rows, { query: '  테스트 회사  ' }).map((r) => r.id), ['a']);
  assert.deepEqual(filter(rows, { query: 'ＦＲＯＮＴＥＮＤ   engineer' }).map((r) => r.id), ['a']);
  assert.equal(filter(rows, { query: '   ' }).length, 2);
});

test('복합 필터는 종료 지원만 숨기며 원본과 순서를 보존한다', () => {
  const statuses = ['applied', 'screening', 'interview', 'interviewed', 'offer', 'rejected', 'canceled'];
  const rows = statuses.map((status) => row(status, { status }));
  rows.push(row('other', { platform: 'wanted' }));
  const before = structuredClone(rows);
  assert.deepEqual(filter(rows, { query: 'frontend', platform: 'saramin', hideClosed: true }).map((r) => r.id), statuses.slice(0, 4));
  assert.deepEqual(rows, before);
  assert.deepEqual(filter(rows, {}), rows);
  assert.equal(filter(rows, { query: '없는회사' }).length, 0);
  assert.deepEqual(filter([], {}), []);
});

test('직접입력 필터와 상태 변경 후 재필터링', () => {
  const rows = [row('a', { platform: 'manual' }), row('b')];
  assert.deepEqual(filter(rows, { platform: 'manual' }).map((r) => r.id), ['a']);
  const changed = rows.map((r) => r.id === 'a' ? { ...r, status: 'offer' } : r);
  assert.equal(filter(changed, { platform: 'manual', hideClosed: true }).length, 0);
});

test('플랫폼으로 표시를 좁혀도 전체 기준 중복 배지를 유지할 수 있다', () => {
  const rows = [row('a'), row('b', { platform: 'wanted' })];
  const duplicates = getDuplicateApplicationIds(rows);
  const visible = filter(rows, { platform: 'saramin' });
  assert.equal(visible.length, 1);
  assert.equal(duplicates.has(visible[0].id), true);
});
