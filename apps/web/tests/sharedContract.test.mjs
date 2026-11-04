import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';
const load = createSourceLoader();
const shared = load('@jobdiary/shared');
const { getPostingReference: posting, buildHistoryEntries, parseHistoryRequest, MAX_HISTORY_ENTRIES } = shared;
const ownerKey = 'a'.repeat(64);
const app = (changes = {}) => ({ platform: 'jobkorea', status: 'applied', url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/101?tracking=x', ...changes });

test('공고 URL을 정규화하되 지원 ID/회사명으로 공고를 추정하지 않는다', () => {
  assert.deepEqual(posting(app().url), { platform: 'jobkorea', postingId: '101', url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/101' });
  assert.equal(posting('https://m.saramin.co.kr/job-search/view?rec_idx=202&tracking=x').url, 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=202');
  assert.equal(posting('https://wanted.co.kr/wd/303').postingId, '303');
  for (const url of ['http://www.jobkorea.co.kr/Recruit/GI_Read/101', 'https://www.jobkorea.co.kr.evil.test/Recruit/GI_Read/101', 'https://user:secret@www.jobkorea.co.kr/Recruit/GI_Read/101', 'https://www.jobkorea.co.kr/User/101', 'javascript:alert(1)', 'https://www.saramin.co.kr/job-search/view?rec_idx=202&rec_idx=203']) assert.equal(posting(url), null);
});
test('마감·불합격도 지원 이력에 포함하고 취소만 있으면 취소로 구분한다', () => {
  assert.deepEqual(buildHistoryEntries([app({ status: 'rejected', deadlineAt: '2020-01-01' }), app({ status: 'canceled' }), app({ url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/102', status: 'canceled' })]),
    { entries: [{ platform: 'jobkorea', postingId: '101', state: 'applied' }, { platform: 'jobkorea', postingId: '102', state: 'canceled' }], unidentifiedCount: 0 });
});
test('URL 없는 과거 기록과 플랫폼 불일치는 미식별로 남긴다', () => {
  const result = buildHistoryEntries([app({ url: undefined, externalId: '101' }), app({ platform: 'wanted' })]);
  assert.equal(result.entries.length, 0);
  assert.equal(result.unidentifiedCount, 2);
});
test('캐시 계약은 버전·크기·중복 키·ID·상태를 검증하고 추가 필드는 버린다', () => {
  const valid = { type: shared.HISTORY_SYNC_TYPE, version: 1, snapshot: { ownerKey, entries: [{ platform: 'jobkorea', postingId: '101', state: 'applied', memo: 'secret' }], unidentifiedCount: 0, access_token: 'secret' } };
  const parsed = parseHistoryRequest(valid);
  assert.equal(JSON.stringify(parsed).includes('secret'), false);
  assert.equal(parseHistoryRequest({ ...valid, version: 2 }), null);
  assert.equal(parseHistoryRequest({ ...valid, snapshot: { ...valid.snapshot, ownerKey: 'email@example.test' } }), null);
  assert.equal(parseHistoryRequest({ ...valid, snapshot: { ...valid.snapshot, entries: [valid.snapshot.entries[0], valid.snapshot.entries[0]] } }), null);
  assert.equal(parseHistoryRequest({ ...valid, snapshot: { ...valid.snapshot, entries: Array(MAX_HISTORY_ENTRIES + 1).fill(valid.snapshot.entries[0]) } }), null);
  assert.equal(parseHistoryRequest({ ...valid, snapshot: { ...valid.snapshot, entries: [{ platform: 'manual', postingId: '101', state: 'applied' }] } }), null);
});

const incoming = (changes = {}) => ({ company: '회사', position: '개발자', appliedAt: '2026-11-01T00:00:00.000Z', externalId: 'apply-101', ...app(), ...changes });
test('실제 웹앱 수신→신규 계획→DB 삽입→조회가 정규화한 URL을 보존한다', async () => {
  const { sanitizeCollectResponse } = load('@/lib/extensionImport');
  const { buildExtensionImportPlan } = load('@/utils/extensionImportPlan');
  const sanitized = sanitizeCollectResponse({ ok: true, applications: [incoming()] });
  const plan = buildExtensionImportPlan([], sanitized.applications);
  assert.equal(plan.toInsert[0].url, 'https://www.jobkorea.co.kr/Recruit/GI_Read/101');
  let row;
  const query = { insert(value) { row = value; return this; }, select() { return this; }, eq() { return this; },
    single: async () => ({ data: { id: 'saved', ...row }, error: null }),
    then(resolve) { return Promise.resolve({ data: [{ id: 'saved', ...row }], error: null }).then(resolve); } };
  const api = createSourceLoader({ '@/lib/supabase': { supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'A' } }, error: null }) }, from: () => query,
  } } })('@/lib/applicationsApi');
  const inserted = await api.insertApplication(plan.toInsert[0]);
  assert.equal(row.url, plan.toInsert[0].url);
  assert.equal(inserted.application.url, row.url);
  assert.equal((await api.fetchApplications()).applications[0].url, row.url);
});
test('위험하거나 다른 플랫폼의 선택적 URL은 버리고 기존 가져오기는 허용한다', () => {
  for (const url of ['javascript:alert(1)', 'https://www.wanted.co.kr/wd/101']) {
    const result = load('@/lib/extensionImport').sanitizeCollectResponse({ ok: true, applications: [incoming({ url })] });
    assert.equal(result.ok, true);
    assert.equal(Object.hasOwn(result.applications[0], 'url'), false);
  }
});
test('빈 URL 보충은 지원 ID가 같을 때만 계획하고 충돌/이미 있는 주소는 유지한다', () => {
  const repairs = load('@/utils/applicationUrlRepairs').buildApplicationUrlRepairs;
  const existing = { ...incoming({ url: undefined, status: 'interview', memo: '유지' }), id: 'saved', updatedAt: '2026-11-01T12:00:00Z' };
  assert.deepEqual(repairs([existing], [incoming()]), [{ id: 'saved', url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/101', expectedUpdatedAt: existing.updatedAt }]);
  assert.deepEqual(repairs([existing], [incoming({ externalId: undefined })]), []);
  assert.deepEqual(repairs([{ ...existing, url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/999' }], [incoming()]), []);
  assert.deepEqual(repairs([existing], [incoming(), incoming({ url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/102' })]), []);
});
