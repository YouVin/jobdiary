import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

const load = createSourceLoader();
const {
  getApplicationOverview, getStageSummary, getPlatformShares, getUpcomingEvents, getRecentApplications, getWeekStart, toDateOnly,
  getMonthCalendar, getWeeklyApplications, getUpcomingWeekLabel, shiftMonth,
} = load('@/utils/applicationStats');

const row = (id, changes = {}) => ({
  id, company: `회사 ${id}`, position: '프론트엔드 개발자', platform: 'saramin', status: 'applied',
  appliedAt: '2026-11-02T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z', ...changes,
});
const TODAY = '2026-11-16'; // 월요일

test('빈 목록은 0과 null로 안전하게 계산한다', () => {
  assert.deepEqual(getApplicationOverview([], TODAY), { total: 0, companyCount: 0, thisWeekCount: 0, manualCount: 0 });
  const stage = getStageSummary([]);
  assert.equal(stage.inProgress, 0);
  assert.equal(stage.screeningPassRate, null);
  assert.deepEqual(getPlatformShares([]).map((item) => item.share), [0, 0, 0, 0]);
  assert.deepEqual(getUpcomingEvents([], TODAY), []);
  assert.deepEqual(getRecentApplications([]), []);
});

test('기업 수는 공백·대소문자·전각을 정규화해 센다', () => {
  const rows = [row('a', { company: '취준 랩스' }), row('b', { company: '취준랩스' }), row('c', { company: 'ＡＢＣ' }), row('d', { company: 'abc' })];
  assert.equal(getApplicationOverview(rows, TODAY).companyCount, 2);
});

test('이번 주는 한국 기준 월요일부터 오늘까지만 센다', () => {
  assert.equal(getWeekStart('2026-11-16'), '2026-11-16');
  assert.equal(getWeekStart('2026-11-22'), '2026-11-16');
  const rows = [
    row('sun', { appliedAt: '2026-11-15T00:00:00.000Z' }),
    row('mon', { appliedAt: '2026-11-16T00:00:00.000Z' }),
    row('future', { appliedAt: '2026-11-17T00:00:00.000Z' }),
    row('manual', { appliedAt: '2026-11-16', platform: 'manual' }),
  ];
  const overview = getApplicationOverview(rows, TODAY);
  assert.equal(overview.thisWeekCount, 2);
  assert.equal(overview.manualCount, 1);
});

test('전형 현황과 서류 통과율은 지원취소를 분모에서 뺀다', () => {
  const statuses = { applied: 21, screening: 6, interview: 3, interviewed: 2, offer: 1, rejected: 12, canceled: 3 };
  const rows = [];
  for (const [status, count] of Object.entries(statuses)) {
    for (let index = 0; index < count; index += 1) rows.push(row(`${status}-${index}`, { status }));
  }
  rows[rows.length - 4].statusSource = 'deadline'; // 탈락 하나를 마감 자동 탈락으로
  const stage = getStageSummary(rows);
  assert.equal(stage.inProgress, 32);
  assert.equal(stage.passedScreening, 12);
  assert.equal(stage.closed, 16);
  assert.equal(stage.screeningBase, 45);
  assert.equal(Math.round(stage.screeningPassRate * 100), 27);
  assert.equal(stage.autoRejected, 1);
  assert.equal(stage.counts.interviewed, 2);
});

test('지원취소만 있으면 통과율을 계산하지 않는다', () => {
  assert.equal(getStageSummary([row('a', { status: 'canceled' })]).screeningPassRate, null);
});

test('지원 경로는 건수순, 같으면 고정 순서로 정렬하고 0건도 남긴다', () => {
  const rows = [row('a', { platform: 'wanted' }), row('b', { platform: 'jobkorea' }), row('c', { platform: 'wanted' })];
  const shares = getPlatformShares(rows);
  assert.deepEqual(shares.map((item) => [item.platform, item.count]), [['wanted', 2], ['jobkorea', 1], ['saramin', 0], ['manual', 0]]);
  assert.equal(shares[0].share, 2 / 3);
});

test('다가오는 일정은 오늘 포함 미래만, 종료 지원 제외, 같은 날이면 면접 먼저', () => {
  const rows = [
    row('deadline-today', { deadlineAt: '2026-11-16' }),
    row('past', { interviewDate: '2026-11-15T00:00:00.000Z' }),
    row('closed', { status: 'rejected', interviewDate: '2026-11-18T00:00:00.000Z' }),
    row('both', { status: 'interview', interviewDate: '2026-11-20T00:00:00.000Z', deadlineAt: '2026-11-20' }),
    row('invalid', { deadlineAt: '2026-13-40' }),
  ];
  const events = getUpcomingEvents(rows, TODAY);
  assert.deepEqual(events.map((event) => [event.applicationId, event.kind, event.daysLeft]), [
    ['deadline-today', 'deadline', 0],
    ['both', 'interview', 4],
    ['both', 'deadline', 4],
  ]);
});

test('최근 지원은 지원일 최신순, 같은 날이면 최근 수정순이며 원본을 바꾸지 않는다', () => {
  const rows = [
    row('old', { appliedAt: '2026-10-01T00:00:00.000Z' }),
    row('new-a', { appliedAt: '2026-11-10T00:00:00.000Z', updatedAt: '2026-11-10T01:00:00.000Z' }),
    row('new-b', { appliedAt: '2026-11-10T00:00:00.000Z', updatedAt: '2026-11-11T01:00:00.000Z' }),
  ];
  const before = structuredClone(rows);
  assert.deepEqual(getRecentApplications(rows, 2).map((item) => item.id), ['new-b', 'new-a']);
  assert.deepEqual(rows, before);
});

test('지원 달력은 월요일 시작으로 이번 달 지원만 날짜별로 센다', () => {
  const rows = [
    row('a', { appliedAt: '2026-11-01T00:00:00.000Z' }),
    row('b', { appliedAt: '2026-11-16T00:00:00.000Z' }),
    row('c', { appliedAt: '2026-11-16' }),
    row('october', { appliedAt: '2026-10-31T00:00:00.000Z' }),
    row('broken', { appliedAt: 'not-a-date' }),
  ];
  const calendar = getMonthCalendar(rows, '2026-11-17');
  assert.equal(calendar.monthTotal, 3);
  assert.equal(calendar.weeks.length, 6); // 11/1이 일요일이라 6주
  assert.deepEqual(calendar.weeks[0].slice(0, 6), [null, null, null, null, null, null]);
  assert.equal(calendar.weeks[0][6].date, '2026-11-01');
  const days = calendar.weeks.flat().filter(Boolean);
  assert.equal(days.length, 30);
  assert.equal(days.find((day) => day.day === 16).count, 2);
  assert.deepEqual(days.find((day) => day.day === 16).companies, ['회사 b', '회사 c']);
  assert.deepEqual(days.find((day) => day.day === 16).applicationIds, ['b', 'c']);
  assert.deepEqual(days.find((day) => day.day === 2).companies, []);
  assert.equal(days.find((day) => day.day === 17).isToday, true);
  assert.equal(days.find((day) => day.day === 18).isFuture, true);
  // 윤년 2월
  const february = getMonthCalendar([], '2028-02-10');
  assert.equal(february.weeks.flat().filter(Boolean).length, 29);
});

test('달력은 가장 많이 지원한 날 하나(2건 이상)와 오늘 이후 일정 점을 담는다 (#203)', () => {
  const rows = [
    row('a', { appliedAt: '2026-11-03' }),
    row('b', { appliedAt: '2026-11-10' }), row('c', { appliedAt: '2026-11-10' }),
    row('d', { appliedAt: '2026-11-12' }), row('e', { appliedAt: '2026-11-12' }),
    // 일정만 보는 지원은 지원일을 지난달로 둬 이 달 지원 수에 섞이지 않게 한다.
    row('meet', { appliedAt: '2026-10-01', status: 'interview', interviewDate: '2026-11-25', deadlineAt: '2026-11-25' }),
    row('done', { appliedAt: '2026-10-01', status: 'rejected', deadlineAt: '2026-11-26' }),
    row('past', { appliedAt: '2026-10-01', deadlineAt: '2026-11-05' }),
  ];
  const calendar = getMonthCalendar(rows, '2026-11-17');
  assert.equal(calendar.topDate, '2026-11-10'); // 같은 2건이면 앞 날짜
  const days = calendar.weeks.flat().filter(Boolean);
  assert.deepEqual(days.find((day) => day.day === 25).events, ['interview', 'deadline']);
  assert.deepEqual(days.find((day) => day.day === 26).events, []); // 끝난 지원 제외
  assert.deepEqual(days.find((day) => day.day === 5).events, []); // 지난 날 제외
  assert.equal(getMonthCalendar([row('one', { appliedAt: '2026-11-03' })], '2026-11-17').topDate, null);
});

test('달력은 다른 달도 그릴 수 있고 달 이동은 연도를 넘긴다', () => {
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  const october = getMonthCalendar([row('oct', { appliedAt: '2026-10-31' })], '2026-11-17', '2026-10');
  assert.equal(october.month, 10);
  assert.equal(october.monthTotal, 1);
  assert.equal(october.weeks.flat().filter(Boolean).every((day) => !day.isFuture && !day.isToday), true);
});

test('주간 지원은 이번 주 포함 최근 8주를 오래된 주부터 센다 (#203)', () => {
  const rows = [
    row('this-week', { appliedAt: '2026-11-17' }),
    row('future', { appliedAt: '2026-11-20' }), // 오늘 이후는 세지 않는다
    row('last-week-mon', { appliedAt: '2026-11-09' }),
    row('last-week-sun', { appliedAt: '2026-11-15' }),
    row('oldest', { appliedAt: '2026-09-28' }), // 8주 전 월요일
    row('too-old', { appliedAt: '2026-09-27' }),
  ];
  const weeks = getWeeklyApplications(rows, '2026-11-18');
  assert.equal(weeks.length, 8);
  assert.equal(weeks[0].weekStart, '2026-09-28');
  assert.equal(weeks[7].weekStart, '2026-11-16');
  assert.deepEqual(weeks.map((week) => week.count), [1, 0, 0, 0, 0, 0, 2, 1]);
  assert.deepEqual(weeks.map((week) => week.isThisWeek), [false, false, false, false, false, false, false, true]);
});

test('일정 주 묶음 이름은 이번 주·다음 주, 그 뒤는 달의 몇째 주', () => {
  const today = '2026-11-23'; // 월요일
  assert.equal(getUpcomingWeekLabel('2026-11-29', today), '이번 주');
  assert.equal(getUpcomingWeekLabel('2026-11-30', today), '다음 주');
  assert.equal(getUpcomingWeekLabel('2026-12-04', today), '다음 주'); // 11/30 월요일에 시작하는 주
  assert.equal(getUpcomingWeekLabel('2026-12-07', today), '12월 둘째 주'); // 12/1 화요일이 있는 주가 첫째 주
  assert.equal(getUpcomingWeekLabel('2026-12-16', today), '12월 셋째 주');
  assert.equal(getUpcomingWeekLabel('2026-12-31', today), '12월 다섯째 주');
});

test('요일 날짜 표시는 연도 선택과 요일을 함께 쓴다', () => {
  const { formatDateWithWeekday } = load('@/utils/format');
  assert.equal(formatDateWithWeekday('2026-11-16'), '11.16 (월)');
  assert.equal(formatDateWithWeekday('2026-11-22', true), '2026.11.22 (일)');
});

test('가져오기 시각은 한국 시간 24시간제로 표시한다', () => {
  const { formatKoreanDateTime } = load('@/utils/format');
  assert.equal(formatKoreanDateTime('2026-11-15T12:40:00.000Z'), '11.15 21:40');
  assert.equal(formatKoreanDateTime('2026-11-15T15:05:00.000Z'), '11.16 00:05');
});

test('마지막 가져오기 시각은 계정별로 저장하고 잘못된 값은 버린다', () => {
  const store = new Map();
  globalThis.window = {};
  globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  try {
    const { loadLastImportAt, saveLastImportAt } = load('@/lib/storage');
    saveLastImportAt('user-a', '2026-11-15T12:40:00.000Z');
    assert.equal(loadLastImportAt('user-a'), '2026-11-15T12:40:00.000Z');
    assert.equal(loadLastImportAt('user-b'), null);
    store.set('jobdiary:lastImportAt:user-b', 'broken');
    assert.equal(loadLastImportAt('user-b'), null);
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
  }
});

test('날짜 변환은 UTC 날짜를 쓰고 잘못된 값은 버린다', () => {
  assert.equal(toDateOnly('2026-11-17T00:00:00.000Z'), '2026-11-17');
  assert.equal(toDateOnly('2026-11-17'), '2026-11-17');
  assert.equal(toDateOnly('not-a-date'), null);
  assert.equal(toDateOnly(undefined), null);
});
