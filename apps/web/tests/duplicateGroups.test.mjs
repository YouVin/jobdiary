import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

const load = createSourceLoader();
const { getDuplicateGroups, getDuplicateApplicationIds } = load('@/utils/duplicateDetection');

const row = (id, platform, appliedAt, changes = {}) => ({
  id, company: '루트랩스', position: '프론트엔드 개발자', platform, status: 'applied',
  appliedAt, updatedAt: appliedAt, ...changes,
});

test('회사명·공고명이 같고 사이트가 2곳 이상인 지원만 묶어, 먼저 지원한 순으로 놓는다', () => {
  const rows = [
    row('w', 'wanted', '2026-11-10T00:00:00.000Z'),
    row('s', 'saramin', '2026-11-03T00:00:00.000Z', { company: ' 루트랩스 ', position: '프론트엔드  개발자' }),
    row('only', 'saramin', '2026-11-04T00:00:00.000Z', { company: '혼자랩스' }),
    row('same1', 'jobkorea', '2026-11-05T00:00:00.000Z', { company: '같은사이트' }),
    row('same2', 'jobkorea', '2026-11-06T00:00:00.000Z', { company: '같은사이트' }),
  ];
  const groups = getDuplicateGroups(rows);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].applications.map((item) => item.id), ['s', 'w']);
  assert.deepEqual(groups[0].platforms, ['saramin', 'wanted']);
  assert.deepEqual([groups[0].company, groups[0].position, groups[0].latestAppliedAt], ['루트랩스', '프론트엔드 개발자', '2026-11-10']);
  assert.deepEqual([...getDuplicateApplicationIds(rows)].sort(), ['s', 'w']);
});

test('같은 사이트가 섞여도 묶음 안에 모두 넣고, 최근에 지원한 묶음이 위에 온다', () => {
  const rows = [
    row('a1', 'saramin', '2026-11-01'),
    row('a2', 'wanted', '2026-11-02'),
    row('a3', 'saramin', '2026-11-08', { status: 'canceled' }),
    row('b1', 'jobkorea', '2026-11-05', { company: '데이브릿지' }),
    row('b2', 'manual', '2026-11-06', { company: '데이브릿지' }),
  ];
  const groups = getDuplicateGroups(rows);
  assert.deepEqual(groups.map((group) => group.company), ['루트랩스', '데이브릿지']);
  assert.deepEqual(groups[0].applications.map((item) => item.id), ['a1', 'a2', 'a3']);
  assert.deepEqual(groups[0].platforms, ['saramin', 'wanted']);
  assert.deepEqual(getDuplicateGroups([]), []);
});

// #220: 사이트마다 공고명이 다르게 들어오는 실제 사례
const { isSamePosting, companyKey, getImportDecision } = load('@/utils/duplicateDetection');

test('사람인 모집 부문과 잡코리아 공고 제목이 달라도 같은 회사·같은 직무면 한 묶음이다', () => {
  const rows = [
    row('sa', 'saramin', '2026-11-17', { company: '(주)스테이지파이브', position: '프론트엔드' }),
    row('jk', 'jobkorea', '2026-11-15', { company: '㈜스테이지파이브', position: '[IT/통신] STAGE FIVE 프론트엔드 개발자 채용', status: 'rejected' }),
  ];
  const groups = getDuplicateGroups(rows);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].applications.map((item) => item.id), ['jk', 'sa']);
  assert.deepEqual(groups[0].platforms, ['jobkorea', 'saramin']);
});

test('회사 이름의 법인 표기·공백·기호는 비교에서 뺀다', () => {
  const names = ['(주)스테이지파이브', '㈜ 스테이지파이브', '주식회사 스테이지파이브', '스테이지 파이브(주)', '스테이지파이브'];
  for (const name of names) assert.equal(companyKey(name), '스테이지파이브', name);
  assert.notEqual(companyKey('스테이지파이브랩'), companyKey('스테이지파이브'));
});

test('영어 직무 표기와 말머리·흔한 말은 같은 공고 판단을 막지 않는다', () => {
  const company = '루트랩스';
  assert.equal(isSamePosting({ company, position: 'Frontend Engineer' }, { company, position: '[신입/경력] 프론트엔드 개발자 모집' }), true);
  assert.equal(isSamePosting({ company, position: 'Back-end Developer' }, { company, position: '백엔드 개발자 (Node.js)' }), true);
  assert.equal(isSamePosting({ company, position: '신입 채용' }, { company, position: '웹 퍼블리셔' }), true);
});

test('같은 회사라도 직무가 다르면 다른 공고이고, 회사가 다르면 직무가 같아도 다른 공고다', () => {
  const rows = [
    row('fe', 'saramin', '2026-11-01', { position: '프론트엔드' }),
    row('be', 'jobkorea', '2026-11-02', { position: '[IT] 백엔드 개발자 채용' }),
    row('other', 'wanted', '2026-11-03', { company: '다른랩스', position: '프론트엔드' }),
  ];
  assert.deepEqual(getDuplicateGroups(rows), []);
  assert.equal(isSamePosting({ company: '루트랩스', position: '웹 개발자' }, { company: '루트랩스', position: '웹퍼블리셔' }), false);
});

test('가져오기는 다른 사이트의 같은 공고만 중복으로 세고, 같은 사이트의 비슷한 공고는 새 지원으로 더한다', () => {
  const existing = [row('jk', 'jobkorea', '2026-11-15', { company: '㈜스테이지파이브', position: '[IT/통신] STAGE FIVE 프론트엔드 개발자 채용' })];
  const incoming = (platform, position) => ({ company: '(주)스테이지파이브', position, platform, status: 'applied', appliedAt: '2026-11-17' });
  assert.equal(getImportDecision(existing, incoming('saramin', '프론트엔드')).type, 'add-duplicate');
  assert.equal(getImportDecision(existing, incoming('jobkorea', '프론트엔드 개발자 경력')).type, 'add');
  assert.equal(getImportDecision(existing, incoming('saramin', '백엔드')).type, 'add');
});
