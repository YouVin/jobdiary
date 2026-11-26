import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

// 날짜 고르기 달력 (#293): 월요일 시작 주, 달 옮기기(말일 넘지 않기), 주 처음·끝, 화면 읽기용 이름.
const { addDays, addMonths, startOfWeek, endOfWeek, getPickerWeeks, isDateOnly, formatPickerDate, formatPickerMonth } = createSourceLoader()('@/utils/datePicker');

test('달력은 월요일에 시작하고, 앞뒤 칸은 이웃 달로 채운다', () => {
  const weeks = getPickerWeeks('2026-11'); // 11월 1일은 일요일
  assert.equal(weeks.length, 6);
  assert.deepEqual(weeks[0].map((day) => day.date), ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
  assert.deepEqual(weeks[0].map((day) => day.inMonth), [false, false, false, false, false, false, true]);
  assert.equal(weeks.at(-1).at(-1).date, '2026-12-06');
  assert.equal(getPickerWeeks('2027-02').length, 4); // 2027년 2월 1일은 월요일, 28일
});

test('날짜 옮기기: 하루·한 주는 달을 넘고, 한 달은 말일을 넘지 않는다', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2028-01-31', 1), '2028-02-29');
  assert.equal(addMonths('2026-03-15', -12), '2025-03-15');
  assert.equal(startOfWeek('2026-11-29'), '2026-11-23'); // 일요일 → 그 주 월요일
  assert.equal(endOfWeek('2026-11-23'), '2026-11-29');
});

test('날짜 모양 확인과 이름', () => {
  assert.equal(isDateOnly('2026-11-27'), true);
  assert.equal(isDateOnly('2026-02-30'), false);
  assert.equal(isDateOnly(''), false);
  assert.equal(formatPickerDate('2026-11-27'), '2026년 11월 27일 금요일');
  assert.equal(formatPickerMonth('2026-11'), '2026년 11월');
});
