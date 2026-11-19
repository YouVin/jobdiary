import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

const load = createSourceLoader();
const { getWeekTimeline, addDays } = load('@/utils/weekTimeline');

const row = (id, changes = {}) => ({
  id, company: `회사 ${id}`, position: '프론트엔드 개발자', platform: 'saramin', status: 'applied',
  appliedAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', ...changes,
});
const TODAY = '2026-11-19'; // 목요일

test('이번 주는 월요일부터 일요일까지 7일이고 오늘·지난 날을 표시한다', () => {
  const week = getWeekTimeline([], TODAY);
  assert.equal(week.start, '2026-11-16');
  assert.equal(week.end, '2026-11-22');
  assert.deepEqual(week.days.map((day) => day.dayOfMonth), [16, 17, 18, 19, 20, 21, 22]);
  assert.deepEqual(week.days.map((day) => day.weekdayIndex), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(week.days.filter((day) => day.isPast).map((day) => day.date), ['2026-11-16', '2026-11-17', '2026-11-18']);
  assert.equal(week.days.find((day) => day.isToday).date, TODAY);
  assert.deepEqual([week.interviewCount, week.deadlineCount, week.laterCount], [0, 0, 0]);
});

test('일요일이 오늘이어도 그 주 월요일에서 시작한다', () => {
  assert.equal(getWeekTimeline([], '2026-11-22').start, '2026-11-16');
});

test('주 이동은 7일 단위이고 월·연 경계를 넘는다', () => {
  assert.equal(getWeekTimeline([], TODAY, 1).start, '2026-11-23');
  assert.equal(getWeekTimeline([], TODAY, -1).start, '2026-11-09');
  const yearEnd = getWeekTimeline([], '2026-12-30');
  assert.equal(yearEnd.start, '2026-12-28');
  assert.equal(yearEnd.end, '2027-01-03');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});

test('면접·마감을 날짜에 놓고 같은 날은 면접을 먼저, 결과가 나온 지원은 뺀다', () => {
  const rows = [
    row('deadline', { company: '가나다', deadlineAt: '2026-11-20' }),
    row('interview', { company: '하하', status: 'interview', interviewDate: '2026-11-20T00:00:00.000Z' }),
    row('rejected', { status: 'rejected', interviewDate: '2026-11-20T00:00:00.000Z' }),
    row('canceled', { status: 'canceled', deadlineAt: '2026-11-21' }),
    row('broken', { deadlineAt: '2026-13-40' }),
  ];
  const week = getWeekTimeline(rows, TODAY);
  const friday = week.days[4];
  assert.equal(friday.date, '2026-11-20');
  assert.deepEqual(friday.events.map((event) => [event.applicationId, event.kind]), [['interview', 'interview'], ['deadline', 'deadline']]);
  assert.equal(week.days[5].events.length, 0);
  assert.deepEqual([week.interviewCount, week.deadlineCount], [1, 1]);
});

test('그날 지원한 건수는 결과가 나온 지원도 함께 센다', () => {
  const rows = [
    row('a', { appliedAt: '2026-11-17T00:00:00.000Z' }),
    row('b', { appliedAt: '2026-11-17', status: 'rejected' }),
    row('c', { appliedAt: '2026-11-15T00:00:00.000Z' }),
  ];
  const week = getWeekTimeline(rows, TODAY);
  assert.equal(week.days[1].appliedCount, 2);
  assert.equal(week.days.reduce((sum, day) => sum + day.appliedCount, 0), 2);
});

test('이 주 이후 일정은 지나지 않은 것만 센다', () => {
  const rows = [
    row('next', { status: 'interview', interviewDate: '2026-11-27T00:00:00.000Z' }),
    row('far', { deadlineAt: '2026-12-31' }),
    row('this', { deadlineAt: '2026-11-21' }),
  ];
  assert.equal(getWeekTimeline(rows, TODAY).laterCount, 2);
  assert.equal(getWeekTimeline(rows, TODAY, 1).laterCount, 1);
  // 지난주를 볼 때 이번 주 일정도 "이후"에 포함된다
  assert.equal(getWeekTimeline(rows, TODAY, -1).laterCount, 3);
});
