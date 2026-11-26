import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

const load = createSourceLoader();
const { getApplicationJourney, createDiaryEntry, DIARY_PROMPTS, DIARY_MAX_LENGTH } = load('@/utils/applicationJourney');

const base = {
  id: 'a', company: '루트랩스', position: '프론트엔드', platform: 'saramin', status: 'interview',
  appliedAt: '2026-11-02T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z',
};
const TODAY = '2026-11-19';

test('지원일·면접일·마감과 기록을 새로운 것부터 놓고 오늘 이후 일정은 예정으로 표시한다', () => {
  const application = {
    ...base,
    interviewDate: '2026-11-25T00:00:00.000Z',
    deadlineAt: '2026-11-10',
    diary: [
      { id: 'n1', content: '지원 동기 정리', createdAt: '2026-11-02T03:00:00.000Z', status: 'applied' },
      { id: 'n2', content: '예상 질문 뽑기', createdAt: '2026-11-18T05:00:00.000Z', status: 'interview' },
      { id: 'n3', content: '두 번째 메모', createdAt: '2026-11-18T09:00:00.000Z' },
    ],
  };
  const items = getApplicationJourney(application, TODAY);
  assert.deepEqual(items.map((item) => item.key), ['interview', 'note-n3', 'note-n2', 'deadline', 'note-n1', 'applied']);
  assert.deepEqual(items.filter((item) => item.isUpcoming).map((item) => item.key), ['interview']);
  assert.equal(items[1].entry.content, '두 번째 메모');
});

test('기록 날짜는 한국 날짜로 본다', () => {
  // UTC 11.18 16:30 = 한국 11.19 01:30
  const items = getApplicationJourney({ ...base, diary: [{ id: 'late', content: '새벽 기록', createdAt: '2026-11-18T16:30:00.000Z' }] }, TODAY);
  assert.equal(items.find((item) => item.kind === 'note').date, '2026-11-19');
});

test('빈 기록과 잘못된 날짜는 건너뛴다', () => {
  const application = {
    ...base,
    interviewDate: 'not-a-date',
    diary: [{ id: 'blank', content: '   ', createdAt: '2026-11-03T00:00:00.000Z' }, { id: 'bad', content: '내용', createdAt: 'oops' }],
  };
  assert.deepEqual(getApplicationJourney(application, TODAY).map((item) => item.key), ['applied']);
});

test('새 기록은 앞뒤 공백을 지우고 길이를 제한하며 지금 단계를 함께 남긴다', () => {
  const now = new Date('2026-11-19T01:00:00.000Z');
  assert.deepEqual(createDiaryEntry('  받은 질문 정리  ', 'interviewed', now, 'id-1'), {
    id: 'id-1', content: '받은 질문 정리', createdAt: '2026-11-19T01:00:00.000Z', status: 'interviewed',
  });
  assert.equal(createDiaryEntry('가'.repeat(DIARY_MAX_LENGTH + 10), 'applied', now, 'id-2').content.length, DIARY_MAX_LENGTH);
  assert.equal(Object.keys(DIARY_PROMPTS).length, 7);
});

test('단계가 바뀐 날을 지나온 기록에 넣는다: 같은 날 기록 아래, 일정 위 (#283)', () => {
  const application = {
    ...base,
    interviewDate: '2026-11-18T00:00:00.000Z',
    statusHistory: [
      { from: null, to: 'applied', source: 'extension', at: '2026-11-02T01:00:00.000Z' },
      { from: 'applied', to: 'screening', source: 'manual', at: '2026-11-10T01:00:00.000Z' },
      { from: 'screening', to: 'interview', source: 'manual', at: '2026-11-18T01:00:00.000Z' },
    ],
    diary: [{ id: 'n1', content: '면접 준비', createdAt: '2026-11-18T05:00:00.000Z', status: 'interview' }],
  };
  const items = getApplicationJourney(application, TODAY);
  assert.deepEqual(items.map((item) => [item.kind, item.date]), [
    ['note', '2026-11-18'], ['status', '2026-11-18'], ['interview', '2026-11-18'], ['status', '2026-11-10'], ['applied', '2026-11-02'],
  ]);
  assert.equal(items[1].step.status, 'interview');
});
