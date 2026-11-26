import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

// 면접 후기 틀과 같은 회사 지난 후기 (#276)
const { INTERVIEW_REVIEW_TEMPLATE, INTERVIEW_REVIEW_CURSOR, isInterviewReview, getPastInterviewReviews } = createSourceLoader()('@/utils/interviewReview');
const entry = (id, content, createdAt, status) => ({ id, content, createdAt, status });
const app = (id, company, diary, position = '프론트엔드') => ({ id, company, position, platform: 'saramin', status: 'applied', appliedAt: '2026-11-01', updatedAt: '', diary });

test('틀은 받은 질문·내 답·아쉬운 점이고, 커서는 첫 줄 "- " 뒤', () => {
  assert.match(INTERVIEW_REVIEW_TEMPLATE, /^받은 질문\n- \n\n내 답\n- \n\n아쉬운 점\n- $/);
  assert.equal(INTERVIEW_REVIEW_TEMPLATE.slice(0, INTERVIEW_REVIEW_CURSOR), '받은 질문\n- ');
});

test('면접 완료 때 쓴 기록이나 틀로 시작한 기록을 후기로 본다', () => {
  assert.equal(isInterviewReview(entry('a', '분위기 좋았음', '2026-11-01T00:00:00Z', 'interviewed')), true);
  assert.equal(isInterviewReview(entry('b', '  받은 질문\n- 자기소개', '2026-11-01T00:00:00Z', 'interview')), true);
  assert.equal(isInterviewReview(entry('c', '지원 동기 정리', '2026-11-01T00:00:00Z', 'applied')), false);
});

test('같은 회사(법인 표기 무시)의 다른 지원 후기만 최근 순으로, 지금 지원·다른 회사는 빼고', () => {
  const current = app('now', '(주)가람소프트', [entry('x', '받은 질문\n- 지금 지원', '2026-11-20T00:00:00Z', 'interviewed')]);
  const reviews = getPastInterviewReviews([
    current,
    app('old1', '가람소프트', [entry('r1', '받은 질문\n- 협업 경험', '2026-03-02T00:00:00Z', 'interview'), entry('n1', '지원함', '2026-03-01T00:00:00Z', 'applied')], '백엔드'),
    app('old2', '주식회사 가람 소프트', [entry('r2', '압박 질문 많음', '2026-06-10T00:00:00Z', 'interviewed')]),
    app('other', '다른회사', [entry('r3', '받은 질문\n- 다른 회사', '2026-07-01T00:00:00Z', 'interviewed')]),
  ], current);
  assert.deepEqual(reviews.map((review) => review.entry.id), ['r2', 'r1']);
  assert.equal(reviews[1].position, '백엔드');
});
