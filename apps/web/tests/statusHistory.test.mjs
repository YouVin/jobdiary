import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

// 단계 변경 이력 (#283): 어디까지 갔는지, 지나온 단계 흐름, 걸린 날, 지나온 기록의 단계 변경.
const load = createSourceLoader();
const { getReachedStatus, hasPassedScreening, getRejectedAfterLabel, getStageFunnel, getStageDurations, getStatusSteps } = load('@/utils/statusHistory');
const { getStageSummary } = load('@/utils/applicationStats');
const { getMonthlyRecap } = load('@/utils/monthlyRecap');

const row = (id, changes = {}) => ({
  id, company: `회사 ${id}`, position: '프론트엔드 개발자', platform: 'saramin', status: 'applied',
  appliedAt: '2026-11-02T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z', statusHistory: [], ...changes,
});
// 한국 시각 오전 10시에 바뀐 변경
const change = (from, to, date, source = 'manual') => ({ from, to, source, at: `${date}T01:00:00.000Z` });

test('면접까지 갔다가 탈락한 곳은 탈락 전 단계로 센다', () => {
  const rejected = row('a', { status: 'rejected', statusHistory: [change(null, 'applied', '2026-11-02'), change('applied', 'screening', '2026-11-10'), change('screening', 'interview', '2026-11-12'), change('interview', 'rejected', '2026-11-20')] });
  assert.equal(getReachedStatus(rejected), 'interview');
  assert.equal(hasPassedScreening(rejected), true);
  assert.equal(getRejectedAfterLabel(rejected), '면접 후 탈락');
  // 서류에서 떨어진 곳·마감 자동 탈락은 서류 통과로 세지 않는다
  const screeningOut = row('b', { status: 'rejected', statusHistory: [change('applied', 'rejected', '2026-11-09')] });
  const deadline = row('c', { status: 'rejected', statusSource: 'deadline', statusHistory: [change('applied', 'rejected', '2026-11-09', 'deadline')] });
  assert.equal(hasPassedScreening(screeningOut), false);
  assert.equal(getRejectedAfterLabel(screeningOut), null);
  assert.equal(hasPassedScreening(deadline), false);
  // 서류 통과 후 탈락
  assert.equal(getRejectedAfterLabel(row('d', { status: 'rejected', statusHistory: [change('screening', 'rejected', '2026-11-09')] })), '서류 통과 후 탈락');
});

test('진행 중인 지원은 지금 단계, 탈락했다 다시 옮긴 것은 마지막 변경을 따른다', () => {
  assert.equal(getReachedStatus(row('a', { status: 'interviewed' })), 'interviewed');
  // 면접으로 잘못 옮겼다 되돌리고 서류에서 탈락: 마지막 탈락 직전은 지원 완료
  const corrected = row('b', { status: 'rejected', statusHistory: [change('applied', 'interview', '2026-11-05'), change('interview', 'applied', '2026-11-05'), change('applied', 'rejected', '2026-11-09')] });
  assert.equal(getReachedStatus(corrected), 'applied');
  // 탈락 → 취소처럼 끝난 단계끼리 옮겨도 그 전 진행 단계를 찾는다
  const twice = row('c', { status: 'canceled', statusHistory: [change('screening', 'rejected', '2026-11-05'), change('rejected', 'canceled', '2026-11-06')] });
  assert.equal(getReachedStatus(twice), 'screening');
});

test('이력이 없는 예전 탈락은 면접 날짜·단계 기록으로 추정한다', () => {
  assert.equal(getReachedStatus(row('a', { status: 'rejected' })), 'applied');
  assert.equal(getReachedStatus(row('b', { status: 'rejected', interviewDate: '2026-11-12T05:00:00.000Z' })), 'interview');
  const noted = row('c', { status: 'rejected', diary: [{ id: 'n1', content: '서류 붙음', createdAt: '2026-11-08T01:00:00.000Z', status: 'screening' }, { id: 'n2', content: '아쉽다', createdAt: '2026-11-20T01:00:00.000Z', status: 'rejected' }] });
  assert.equal(getReachedStatus(noted), 'screening');
  // 처음부터 탈락으로 저장된 지원(가져올 때 이미 불합격)도 추정으로
  assert.equal(getReachedStatus(row('d', { status: 'rejected', interviewDate: '2026-11-12', statusHistory: [change(null, 'rejected', '2026-11-20', 'extension')] })), 'interview');
});

test('서류 통과율과 돌아보기는 면접 후 탈락을 통과로 센다', () => {
  const rows = [
    row('a', { status: 'rejected', statusHistory: [change('interview', 'rejected', '2026-11-20')] }),
    row('b', { status: 'rejected', statusHistory: [change('applied', 'rejected', '2026-11-20')] }),
    row('c', { status: 'screening' }),
    row('d'),
    row('e', { status: 'canceled', statusHistory: [change('screening', 'canceled', '2026-11-20')] }), // 취소는 분모·분자 모두 빠진다
  ];
  const stage = getStageSummary(rows);
  assert.equal(stage.passedScreening, 2);
  assert.equal(stage.screeningBase, 4);
  assert.equal(stage.screeningPassRate, 0.5);
  assert.equal(getMonthlyRecap(rows, '2026-11-26').passedCount, 3); // 돌아보기는 이번 달 지원 전체 기준(취소 포함)
});

test('지나온 단계 흐름은 어디까지 갔는지로 센다', () => {
  const rows = [
    row('a', { status: 'offer' }),
    row('b', { status: 'rejected', statusHistory: [change('interviewed', 'rejected', '2026-11-20')] }),
    row('c', { status: 'rejected', statusHistory: [change('screening', 'rejected', '2026-11-20')] }),
    row('d', { status: 'rejected' }),
    row('e'),
    row('f', { status: 'canceled' }),
  ];
  assert.deepEqual(getStageFunnel(rows), { applied: 5, screening: 3, interview: 2, offer: 1 });
});

test('걸린 날은 실제 이력만으로, 2곳 이상일 때 평균을 낸다', () => {
  const rows = [
    row('a', { appliedAt: '2026-11-02', statusHistory: [change(null, 'applied', '2026-11-02'), change('applied', 'screening', '2026-11-10')] }), // 8일
    row('b', { appliedAt: '2026-11-03T00:00:00.000Z', statusHistory: [change('applied', 'interview', '2026-11-14')] }), // 11일 (바로 면접도 서류 통과)
    row('c', { appliedAt: '2026-11-03', statusHistory: [change('applied', 'rejected', '2026-11-05')] }), // 탈락은 서류 통과 평균에 안 들어간다
    row('d', { appliedAt: '2026-11-01', interviewDate: '2026-11-12', statusHistory: [change('applied', 'screening', '2026-11-09'), change('screening', 'interview', '2026-11-10'), change('interview', 'rejected', '2026-11-15')] }), // 8일, 면접 후 3일
  ];
  const durations = getStageDurations(rows);
  assert.deepEqual(durations.toScreening, { days: 9, count: 3 });
  assert.equal(durations.afterInterview, null, '면접 후 결과는 1곳뿐이라 아직 보이지 않는다');
  const more = getStageDurations([...rows, row('e', { interviewDate: '2026-11-12T05:00:00.000Z', statusHistory: [change('interviewed', 'offer', '2026-11-19')] })]);
  assert.deepEqual(more.afterInterview, { days: 5, count: 2 });
  // 한국 날짜로 센다: 11-09 23시(UTC 14시)는 11-09
  assert.deepEqual(getStageDurations([row('x', { appliedAt: '2026-11-02', statusHistory: [{ from: 'applied', to: 'screening', at: '2026-11-09T14:00:00.000Z' }] }), row('y', { appliedAt: '2026-11-02', statusHistory: [{ from: 'applied', to: 'screening', at: '2026-11-09T15:00:00.000Z' }] })]).toScreening, { days: 8, count: 2 });
});

test('지나온 기록의 단계 변경은 처음 지원 완료와 10분 안에 되돌린 것을 뺀다', () => {
  const application = row('a', {
    statusHistory: [
      change(null, 'applied', '2026-11-02', 'extension'),
      change('applied', 'screening', '2026-11-10'),
      { from: 'screening', to: 'rejected', source: 'manual', at: '2026-11-12T01:00:00.000Z' },
      { from: 'rejected', to: 'screening', source: 'manual', at: '2026-11-12T01:00:30.000Z' }, // 되돌리기
      change('screening', 'interview', '2026-11-13'),
    ],
  });
  const steps = getStatusSteps(application);
  assert.deepEqual(steps.map((step) => [step.status, step.date]), [['screening', '2026-11-10'], ['interview', '2026-11-13']]);
  // 처음부터 다른 단계로 저장된 것은 남긴다
  const imported = getStatusSteps(row('b', { statusHistory: [change(null, 'screening', '2026-11-20', 'extension')] }));
  assert.equal(imported.length, 1);
  assert.equal(imported[0].isFirst, true);
  assert.equal(imported[0].source, 'extension');
});

test('DB: 이력은 트리거만 쓰고, 수동 단계 보호 뒤에 돌며, 최근 50번만 둔다', () => {
  const sql = fs.readFileSync('../../supabase/migrations/20261126130000_application_status_history.sql', 'utf8');
  assert.match(sql, /add column status_history jsonb not null default '\[\]'::jsonb/);
  assert.match(sql, /new\.status_history := old\.status_history;/, '브라우저가 보낸 값은 무시');
  assert.match(sql, /new\.status is distinct from old\.status/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /v_count > 50/);
  assert.match(sql, /revoke execute on function public\.record_application_status_history\(\) from public, anon, authenticated/);
  assert.match(sql, /create trigger record_application_status_history\s+before insert or update on public\.applications/);
  // 같은 시점 트리거는 이름 순서로 돈다: 수동 보호(p...)가 먼저
  assert.ok('preserve_manual_application_status' < 'record_application_status_history');
});
