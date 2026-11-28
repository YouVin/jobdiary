import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

// 이번 달 돌아보기 (#275, #316): 그 달에 생긴 일 기준의 숫자·달력·소식
const { getMonthlyRecap, getRecapMonths, summarizeMonthlyRecap, describeMonthlyRecap } = createSourceLoader()('@/utils/monthlyRecap');
const app = (values) => ({ id: values.id ?? Math.random().toString(36), company: '가상회사', position: '', platform: 'saramin', status: 'applied', updatedAt: '', ...values });
const change = (from, to, at) => ({ from, to, at, source: 'manual' });

test('그 달에 지원한 곳, 그 달에 서류 통과·합격으로 옮긴 곳, 그 달 면접·기록을 센다', () => {
  const recap = getMonthlyRecap([
    app({ company: '가람', appliedAt: '2026-11-03', platform: 'jobkorea', status: 'screening', statusHistory: [change(null, 'applied', '2026-11-03T01:00:00Z'), change('applied', 'screening', '2026-11-28T03:00:00Z')] }),
    app({ company: '나래', appliedAt: '2026-11-03T05:00:00.000Z', platform: 'jobkorea', status: 'offer', interviewDate: '2026-11-20T01:00:00.000Z',
      statusHistory: [change(null, 'applied', '2026-11-03T05:00:00Z'), change('applied', 'screening', '2026-11-10T01:00:00Z'), change('screening', 'interview', '2026-11-12T01:00:00Z'), change('interview', 'offer', '2026-11-25T01:00:00Z')] }),
    app({ company: '다온', appliedAt: '2026-11-10', status: 'rejected', diary: [{ id: 'd1', content: '\n지원 동기를 적었다\n둘째 줄', createdAt: '2026-11-11T03:00:00.000Z' }] }),
    // 지난달 지원: 지원 수에서 빠지고, 이번 달 면접·기록은 센다
    app({ company: '라온', appliedAt: '2026-10-28', status: 'interview', interviewDate: '2026-11-25', diary: [
      { id: 'd2', content: 'b', createdAt: '2026-10-31T16:30:00.000Z' }, // 한국 11월 1일 01:30
      { id: 'd3', content: 'c', createdAt: '2026-10-31T14:00:00.000Z' }, // 한국 10월 31일 23:00
    ] }),
    // 처음 저장할 때부터 서류 통과(가져오기): 그날을 통과한 날로 보지 않는다
    app({ company: '마루', appliedAt: '2026-10-01', status: 'screening', statusHistory: [change(null, 'screening', '2026-11-26T01:00:00Z')] }),
  ], '2026-11');
  assert.equal(recap.monthNumber, 11);
  assert.equal(recap.appliedCount, 3);
  assert.deepEqual(recap.appliedByDay, { 3: 2, 10: 1 });
  assert.equal(recap.passedCount, 2, '가람(28일)·나래(10일), 마루는 제외');
  assert.equal(recap.offerCount, 1);
  assert.equal(recap.interviewCount, 2);
  assert.equal(recap.diaryCount, 2, '한국 날짜 기준');
  assert.deepEqual(recap.markedDays, [10, 20, 25, 28]);
  assert.equal(recap.topPlatform, '잡코리아');
  assert.deepEqual(recap.busiestDay, { day: 3, count: 2 });
  // 소식: 최근 날짜부터, 같은 날은 합격 > 서류 통과 > 면접 > 기록 > 지원
  assert.deepEqual(recap.events.map((e) => `${e.date.slice(8)} ${e.kind} ${e.companies.join('+')}`), [
    '28 screening 가람', '25 offer 나래', '25 interview 라온', '20 interview 나래', '11 diary 다온', '10 screening 나래', '10 applied 다온', '03 applied 가람+나래', '01 diary 라온',
  ]);
  assert.equal(recap.events.find((e) => e.kind === 'diary' && e.companies[0] === '다온').text, '지원 동기를 적었다', '기록은 첫 줄');
  assert.equal(describeMonthlyRecap(recap), '11월에 3곳 지원, 서류 통과 2곳, 면접 2번, 합격 1곳, 기록 2개.');
  assert.equal(summarizeMonthlyRecap(recap, true), '이번 달 3곳에 지원했고, 1곳에 합격했어요.');
});

test('요약 문장: 지원만, 소식만, 아무것도 없을 때', () => {
  const onlyApplied = getMonthlyRecap([app({ appliedAt: '2026-11-05' }), app({ appliedAt: '2026-11-06' })], '2026-11');
  assert.equal(onlyApplied.busiestDay, null, '하루 1곳뿐이면 가장 바빴던 날 없음');
  assert.equal(summarizeMonthlyRecap(onlyApplied, false), '11월에 2곳에 지원했어요.');
  const onlyPass = getMonthlyRecap([app({ appliedAt: '2026-10-05', status: 'screening', statusHistory: [change(null, 'applied', '2026-10-05T01:00:00Z'), change('applied', 'screening', '2026-11-02T01:00:00Z')] })], '2026-11');
  assert.equal(summarizeMonthlyRecap(onlyPass, true), '이번 달 1곳이 서류를 통과했어요.');
  const empty = getMonthlyRecap([], '2026-11');
  assert.deepEqual([empty.appliedCount, empty.events.length, empty.topPlatform], [0, 0, null]);
  assert.equal(summarizeMonthlyRecap(empty, true), '이번 달은 아직 지원 소식이 없어요.');
  assert.equal(summarizeMonthlyRecap(empty, false), '11월에는 지원 소식이 없어요.');
});

test('넘겨 볼 달: 가장 이른 지원의 달부터 이번 달까지, 해가 바뀌어도', () => {
  assert.deepEqual(getRecapMonths([app({ appliedAt: '2025-11-20' }), app({ appliedAt: '2026-01-03' })], '2026-02-10'), ['2025-11', '2025-12', '2026-01', '2026-02']);
  assert.deepEqual(getRecapMonths([], '2026-11-28'), ['2026-11']);
});
