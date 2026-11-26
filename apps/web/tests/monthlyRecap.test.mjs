import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

// 이번 달 돌아보기 숫자 (#275)
const { getMonthlyRecap, describeMonthlyRecap } = createSourceLoader()('@/utils/monthlyRecap');
const app = (values) => ({ id: values.id ?? Math.random().toString(36), company: '가상회사', position: '', platform: 'saramin', status: 'applied', updatedAt: '', ...values });

test('이번 달 지원만 세고, 면접일·기록은 이번 달에 있었던 것을 센다', () => {
  const recap = getMonthlyRecap([
    app({ appliedAt: '2026-11-03', status: 'screening', platform: 'jobkorea' }),
    app({ appliedAt: '2026-11-03T05:00:00.000Z', status: 'offer', platform: 'jobkorea', interviewDate: '2026-11-20T01:00:00.000Z' }),
    app({ appliedAt: '2026-11-10', status: 'rejected', platform: 'saramin', diary: [{ id: 'd1', content: 'a', createdAt: '2026-11-11T03:00:00.000Z' }] }),
    // 지난달 지원: 지원 수에는 빠지고, 이번 달 면접·기록은 센다
    app({ appliedAt: '2026-10-28', status: 'interview', interviewDate: '2026-11-25', diary: [
      { id: 'd2', content: 'b', createdAt: '2026-10-31T16:30:00.000Z' }, // 한국 11월 1일 01:30
      { id: 'd3', content: 'c', createdAt: '2026-10-31T14:00:00.000Z' }, // 한국 10월 31일 23:00
    ] }),
  ], '2026-11-26');
  assert.equal(recap.month, '2026-11');
  assert.equal(recap.monthNumber, 11);
  assert.equal(recap.appliedCount, 3);
  assert.equal(recap.passedCount, 2);
  assert.equal(recap.offerCount, 1);
  assert.equal(recap.interviewCount, 2);
  assert.equal(recap.diaryCount, 2, '한국 날짜 기준');
  assert.equal(recap.topPlatform, '잡코리아');
  assert.deepEqual(recap.busiestDay, { day: 3, count: 2 });
  assert.equal(recap.totalCount, 4);
  assert.equal(describeMonthlyRecap(recap), '11월에 3곳 지원, 서류 통과 이상 2곳, 면접 2번, 합격 1곳, 기록 2개.');
});

test('지원이 없으면 0과 빈 값, 하루 1곳뿐이면 가장 바빴던 날은 없다', () => {
  const empty = getMonthlyRecap([], '2026-11-26');
  assert.deepEqual([empty.appliedCount, empty.topPlatform, empty.busiestDay], [0, null, null]);
  const single = getMonthlyRecap([app({ appliedAt: '2026-11-05' }), app({ appliedAt: '2026-11-06' })], '2026-11-26');
  assert.equal(single.busiestDay, null);
  assert.equal(describeMonthlyRecap(single), '11월에 2곳 지원, 서류 통과 이상 0곳, 면접 0번, 기록 0개.');
});
