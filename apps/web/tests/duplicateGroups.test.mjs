import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

const load = createSourceLoader();
const { getDuplicateGroups, getDuplicateApplicationIds } = load('@/utils/duplicateDetection');

const row = (id, platform, appliedAt, changes = {}) => ({
  id, company: '루트랩스', position: '프론트엔드 개발자', platform, status: 'applied',
  appliedAt, updatedAt: appliedAt, ...changes,
});

test('회사명·공고명이 같고 사이트가 2곳 이상인 지원만 묶어, 먼저 지원한 순으로 놓는다', () => {
  const rows = [
    row('w', 'wanted', '2026-11-10T00:00:00.000Z'),
    row('s', 'saramin', '2026-11-03T00:00:00.000Z', { company: ' 루트랩스 ', position: '프론트엔드  개발자' }),
    row('only', 'saramin', '2026-11-04T00:00:00.000Z', { company: '혼자랩스' }),
    row('same1', 'jobkorea', '2026-11-05T00:00:00.000Z', { company: '같은사이트' }),
    row('same2', 'jobkorea', '2026-11-06T00:00:00.000Z', { company: '같은사이트' }),
  ];
  const groups = getDuplicateGroups(rows);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].applications.map((item) => item.id), ['s', 'w']);
  assert.deepEqual(groups[0].platforms, ['saramin', 'wanted']);
  assert.deepEqual([groups[0].company, groups[0].position, groups[0].latestAppliedAt], ['루트랩스', '프론트엔드 개발자', '2026-11-10']);
  assert.deepEqual([...getDuplicateApplicationIds(rows)].sort(), ['s', 'w']);
});

test('같은 사이트가 섞여도 묶음 안에 모두 넣고, 최근에 지원한 묶음이 위에 온다', () => {
  const rows = [
    row('a1', 'saramin', '2026-11-01'),
    row('a2', 'wanted', '2026-11-02'),
    row('a3', 'saramin', '2026-11-08', { status: 'canceled' }),
    row('b1', 'jobkorea', '2026-11-05', { company: '데이브릿지' }),
    row('b2', 'manual', '2026-11-06', { company: '데이브릿지' }),
  ];
  const groups = getDuplicateGroups(rows);
  assert.deepEqual(groups.map((group) => group.company), ['루트랩스', '데이브릿지']);
  assert.deepEqual(groups[0].applications.map((item) => item.id), ['a1', 'a2', 'a3']);
  assert.deepEqual(groups[0].platforms, ['saramin', 'wanted']);
  assert.deepEqual(getDuplicateGroups([]), []);
});
