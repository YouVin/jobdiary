// 실제 로컬 Next.js + MV3 확장. 인증/DB HTTP만 고정 표본으로 대체하며 실계정은 사용하지 않는다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || path.join(root, 'apps/web/node_modules/.release-tools/node_modules/playwright/index.mjs')).href);
const output = path.join(root, 'release/history-validation');
const extension = process.env.EXTENSION_PATH || path.join(output, 'extension-development');
const origin = 'http://localhost:3000';
const cacheKey = 'jobdiary:application-history:v1:' + origin;
const extensionId = 'dckfpbmglbagcpnkkkdcnbnpjdpfjcde';
const env = fs.readFileSync(path.join(root, 'apps/web/.env.local'), 'utf8');
const publicUrl = env.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^"'\r\n]+)/m)?.[1].trim();
assert(publicUrl, '웹앱 환경 파일에 공개 Supabase URL 필요');
const authKey = 'sb-' + new URL(publicUrl).hostname.split('.')[0] + '-auth-token';
const user = id => ({ id, email: 'synthetic@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { terms_version: '2026-10-17', privacy_version: '2026-10-17' }, created_at: '2026-01-01T00:00:00Z' });
const users = [user('11111111-1111-4111-8111-111111111111'), user('22222222-2222-4222-8222-222222222222')];
const session = current => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return { access_token: encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: current.id, exp }) + '.synthetic',
    refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: current };
};
const row = (current, id, changes = {}) => ({ id, user_id: current.id, company: 'Synthetic ' + id, position: 'Developer', platform: 'jobkorea', status: 'applied',
  status_source: 'extension', applied_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z', created_at: '2026-11-01T00:00:00Z',
  deadline_at: null, external_id: null, url: null, memo: null, diary: [], interview_date: null, ...changes });
const rows = [
  row(users[0], 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', { external_id: 'apply-101', status: 'interview', status_source: 'manual', memo: 'private synthetic memo' }),
  row(users[0], 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', { external_id: 'apply-102', status: 'rejected', deadline_at: '2020-01-01', url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/102' }),
  row(users[0], 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', { platform: 'wanted' }),
  row(users[1], 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', { status: 'canceled', url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/201' }),
];
const errors = [];
const writes = [];
const checks = [];
let context;
const check = async (name, run) => { await run(); checks.push(name); console.log('PASS ' + name); };
fs.mkdirSync(output, { recursive: true });
try {
  context = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(output, 'browser-profile-')), {
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'chromium' }),
    headless: true, args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension],
  });
  context.setDefaultTimeout(20000);
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await context.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (!['http:', 'https:'].includes(url.protocol)) return route.continue();
    if (url.origin === origin) return route.continue();
    if (!url.hostname.endsWith('.supabase.co')) { errors.push('Unexpected external host'); return route.abort(); }
    const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    let current;
    try {
      const token = req.headers().authorization?.split(' ')[1];
      current = users.find(value => value.id === JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).sub);
    } catch { /* 인증 없는 요청은 허용하지 않는다. */ }
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
    assert(current, '모든 인증/DB 요청은 고정 표본 계정만 사용');
    if (url.pathname === '/auth/v1/user') return send(current);
    if (url.pathname === '/rest/v1/applications') {
      const method = req.method();
      if (method === 'POST') {
        const payload = req.postDataJSON();
        assert(Array.isArray(payload), '익스텐션 배치 삽입');
        const added = payload.map((value, index) => {
          assert.equal(value.user_id, current.id);
          return row(current, 'eeeeeeee-eeee-4eee-8eee-' + String(index).padStart(12, '0'), value);
        });
        rows.push(...added);
        return send(added, 201);
      }
      assert.equal(url.searchParams.get('user_id'), 'eq.' + current.id);
      let found = rows.filter(value => value.user_id === current.id);
      if (url.searchParams.has('id')) found = found.filter(value => 'eq.' + value.id === url.searchParams.get('id'));
      if (method === 'PATCH' && url.searchParams.has('status_source')) return send([]);
      if (method === 'PATCH') {
        const payload = req.postDataJSON();
        writes.push(payload);
        assert.deepEqual(Object.keys(payload).sort(), ['updated_at', 'url']);
        assert.equal(url.searchParams.get('updated_at'), 'eq.' + found[0].updated_at);
        found.forEach(value => Object.assign(value, payload));
        return send(found[0]);
      }
      if (method === 'GET') return send(found);
    }
    errors.push('Unexpected Supabase path');
    return route.abort();
  });
  await context.addInitScript(({ origin, key, value }) => {
    if (location.origin === origin && !sessionStorage.getItem('synthetic-session-set')) {
      localStorage.setItem(key, JSON.stringify(value));
      sessionStorage.setItem('synthetic-session-set', '1');
    }
  }, { origin, key: authKey, value: session(users[0]) });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const read = () => worker.evaluate(async key => (await chrome.storage.local.get(key))[key] ?? null, cacheKey);
  const waitFor = async predicate => {
    for (let i = 0; i < 100; i++) {
      const cache = await read();
      if (predicate(cache)) return cache;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('브라우저 동기화 결과 대기 시간 초과');
  };
  const page = await context.newPage();
  await page.goto(origin);
  await check('실제 웹앱 로그인 복원→DB 조회→MV3 캐시, 마감 이력 포함·URL 없는 기록 구분', async () => {
    const cache = await waitFor(value => value?.entries.length === 1 && value.unidentifiedCount === 2);
    assert.equal(cache.ownerKey, createHash('sha256').update(users[0].id).digest('hex'));
    assert.deepEqual(cache.entries, [{ platform: 'jobkorea', postingId: '102', state: 'applied' }]);
    assert.equal(JSON.stringify(cache).includes('private synthetic memo'), false);
  });
  await check('실제 가져오기 UI→빈 URL 보완·신규 삽입→비교 캐시 갱신', async () => {
    await worker.evaluate(async existing => chrome.storage.local.set({ 'jobdiary:collected': { saramin: [], wanted: [], jobkorea: [
      { company: existing.company, position: existing.position, platform: 'jobkorea', status: 'applied', appliedAt: '2026-11-01T00:00:00Z', externalId: 'apply-101', url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/101?tracking=x' },
      { company: 'Synthetic New', position: 'Developer', platform: 'jobkorea', status: 'applied', appliedAt: '2026-11-01T00:00:00Z', externalId: 'apply-103', url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/103', deadlineAt: '2030-11-30' },
    ] } }), rows[0]);
    await page.getByRole('button', { name: '익스텐션에서 가져오기', exact: true }).click();
    await waitFor(value => value?.entries.length === 3);
    assert.equal(rows[0].status, 'interview');
    assert.equal(rows[0].memo, 'private synthetic memo');
    assert.equal(rows[0].url, 'https://www.jobkorea.co.kr/Recruit/GI_Read/101');
    assert.equal(rows.find(value => value.external_id === 'apply-103').deadline_at, '2030-11-30');
    assert.equal(writes.length, 1);
  });
  await check('새로고침·반복 가져오기 후 날짜/주소 보존과 신규 중복 없음', async () => {
    const beforeReload = (await read()).syncedAt;
    await page.reload();
    await waitFor(value => value?.entries.length === 3 && value.syncedAt !== beforeReload);
    const beforeImport = (await read()).syncedAt;
    await page.getByRole('button', { name: '익스텐션에서 가져오기', exact: true }).click();
    await page.getByText(/건 추가/).first().waitFor();
    await waitFor(value => value?.entries.length === 3 && value.syncedAt !== beforeImport);
    assert.equal(rows.filter(value => value.external_id === 'apply-103').length, 1);
    assert.equal(rows.find(value => value.external_id === 'apply-103').deadline_at, '2030-11-30');
  });
  await check('수집 슬롯 초기화 후 비교 캐시 유지', async () => {
    await worker.evaluate(() => chrome.storage.local.remove('jobdiary:collected'));
    assert.equal((await read()).entries.length, 3);
  });
  await check('실제 로그아웃 UI→계정 캐시 삭제', async () => {
    await page.getByRole('button', { name: '로그아웃', exact: true }).click();
    await waitFor(value => value === null);
  });
  await check('다른 계정 로그인 복원→이전 지원 제외·취소 구분', async () => {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: authKey, value: session(users[1]) });
    await page.goto(origin);
    const cache = await waitFor(value => value?.entries.length === 1 && value.entries[0].postingId === '201');
    assert.equal(cache.ownerKey, createHash('sha256').update(users[1].id).digest('hex'));
    assert.equal(cache.entries[0].state, 'canceled');
  });
  await check('실제 외부 메시지의 잘못된 버전 거부·기존 캐시 보존', async () => {
    const before = await read();
    const response = await page.evaluate(id => new Promise(resolve => chrome.runtime.sendMessage(id, { type: 'JOBDIARY_HISTORY_SYNC', version: 2 }, resolve)), extensionId);
    assert.equal(response.ok, false);
    assert.deepEqual(await read(), before);
  });
  await check('페이지 오류·예상 밖 외부 요청 없음', async () => { assert.deepEqual(errors, []); });
  fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify({ passed: true, at: new Date().toISOString(), browser: context.browser().version(), checks,
    scope: 'Actual local Next.js and MV3; synthetic Auth/DB HTTP. No real account/DB writes.' }, null, 2));
} catch (error) {
  fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify({ passed: false, at: new Date().toISOString(), checks, error: error.message }, null, 2));
  console.error(error.stack);
  process.exitCode = 1;
} finally { await context?.close(); }
