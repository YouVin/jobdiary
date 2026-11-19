import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

const load = createSourceLoader();
const { getWaitingBoard, STALE_DAYS } = load('@/utils/waitingList');

const row = (id, changes = {}) => ({
  id, company: `회사 ${id}`, position: '프론트엔드 개발자', platform: 'saramin', status: 'applied',
  appliedAt: '2026-11-10T00:00:00.000Z', updatedAt: '2026-11-10T00:00:00.000Z', ...changes,
});
const TODAY = '2026-11-19'; // 목요일, 이번 주 11.16 ~ 11.22

test('진행 중 지원만 오래 기다린 순으로 놓고 이번 주 일정이 있는 지원은 뺀다', () => {
  const rows = [
    row('new', { appliedAt: '2026-11-18T00:00:00.000Z' }),
    row('old', { appliedAt: '2026-10-01T00:00:00.000Z', status: 'screening' }),
    row('thisWeek', { appliedAt: '2026-09-01', status: 'interview', interviewDate: '2026-11-21T00:00:00.000Z' }),
    row('pastThisWeek', { appliedAt: '2026-09-01', deadlineAt: '2026-11-16' }),
    row('rejected', { appliedAt: '2026-09-01', status: 'rejected' }),
  ];
  const board = getWaitingBoard(rows, TODAY);
  assert.deepEqual(board.items.map((item) => item.application.id), ['old', 'new']);
  assert.equal(board.scheduledCount, 2);
  assert.deepEqual(board.items.map((item) => item.stageIndex), [1, 0]);
});

test('지원 후 일수와 지원완료 14일 이상 소식 없음', () => {
  const rows = [
    row('stale', { appliedAt: '2026-11-05T00:00:00.000Z' }),
    row('fresh', { appliedAt: '2026-11-06T00:00:00.000Z' }),
    row('screeningLong', { appliedAt: '2026-10-01T00:00:00.000Z', status: 'screening' }),
    row('future', { appliedAt: '2026-11-25' }),
  ];
  const byId = Object.fromEntries(getWaitingBoard(rows, TODAY).items.map((item) => [item.application.id, item]));
  assert.equal(STALE_DAYS, 14);
  assert.deepEqual([byId.stale.waitDays, byId.stale.isStale], [14, true]);
  assert.deepEqual([byId.fresh.waitDays, byId.fresh.isStale], [13, false]);
  // 서류통과 이후는 오래 지나도 "소식 없음"이 아니다
  assert.equal(byId.screeningLong.isStale, false);
  assert.equal(byId.future.waitDays, 0);
});

test('다음 일정은 오늘 이후 가장 가까운 면접·마감이다', () => {
  const rows = [
    row('both', { status: 'interview', interviewDate: '2026-12-03T00:00:00.000Z', deadlineAt: '2026-11-27' }),
    row('past', { deadlineAt: '2026-11-01' }),
    row('none'),
  ];
  const byId = Object.fromEntries(getWaitingBoard(rows, TODAY).items.map((item) => [item.application.id, item]));
  assert.deepEqual(byId.both.nextEvent, { kind: 'deadline', date: '2026-11-27', daysLeft: 8 });
  assert.equal(byId.past.nextEvent, null);
  assert.equal(byId.none.nextEvent, null);
});

test('단계 필터는 목록만 줄이고 건수 집계는 전체 기준이다', () => {
  const rows = [
    row('a'), row('b', { status: 'screening' }), row('c', { status: 'screening', interviewDate: '2026-11-20T00:00:00.000Z' }),
    row('d', { status: 'offer' }), row('e', { status: 'rejected' }), row('f', { status: 'rejected' }), row('g', { status: 'canceled' }),
  ];
  const board = getWaitingBoard(rows, TODAY, 'screening');
  assert.deepEqual(board.items.map((item) => item.application.id), ['b']);
  assert.equal(board.scheduledCount, 1);
  assert.deepEqual([board.stageCounts.applied, board.stageCounts.screening], [1, 2]);
  assert.deepEqual(board.resultCounts, { rejected: 2, offer: 1, canceled: 1 });
  assert.equal(board.resultTotal, 4);
});
