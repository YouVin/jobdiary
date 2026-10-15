import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

const { getTodayInKorea, isValidDateOnly, shouldAutoReject } = createSourceLoader()('@/utils/applicationDeadline');

test('한국 날짜 경계에서 마감일 다음 날부터 처리한다', () => {
  assert.equal(getTodayInKorea(new Date('2026-10-14T14:59:59Z')), '2026-10-14');
  assert.equal(getTodayInKorea(new Date('2026-10-14T15:00:00Z')), '2026-10-15');
  assert.equal(shouldAutoReject({ status: 'applied', deadlineAt: '2026-10-14' }, '2026-10-14'), false);
  assert.equal(shouldAutoReject({ status: 'applied', deadlineAt: '2026-10-14' }, '2026-10-15'), true);
  assert.equal(shouldAutoReject({ status: 'applied', statusSource: 'extension', deadlineAt: '2026-10-14' }, '2026-10-15'), true);
  assert.equal(shouldAutoReject({ status: 'applied', statusSource: 'created', deadlineAt: '2026-10-14' }, '2026-10-15'), true);
  assert.equal(shouldAutoReject({ status: 'applied', statusSource: 'manual', deadlineAt: '2026-10-14' }, '2026-10-15'), false);
});

test('마감일 없음·잘못된 날짜·진행 중 상태는 자동 탈락하지 않는다', () => {
  assert.equal(isValidDateOnly('2026-02-30'), false);
  assert.equal(shouldAutoReject({ status: 'applied' }, '2026-10-15'), false);
  assert.equal(shouldAutoReject({ status: 'applied', deadlineAt: '2026-02-30' }, '2026-10-15'), false);
  assert.equal(shouldAutoReject({ status: 'screening', deadlineAt: '2026-10-01' }, '2026-10-15'), false);
});
