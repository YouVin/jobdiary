import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

// 가입 경로 (#290): 첫 방문 출처 읽기·기억하기·가입 직후 한 번 보내기, DB 권한.
const { readAcquisition, isFreshAcquisition } = createSourceLoader()('@/utils/acquisition');
const NOW = new Date('2026-11-26T03:00:00.000Z');
const THREADS = 'https://jobdiary.vercel.app/intro?utm_source=Threads&utm_medium=social&utm_campaign=launch_2026_11&fbclid=abc#top';

function setup({ rpcError = null, rpcThrows = false, data = true } = {}) {
  let stored = null;
  const calls = [];
  const supabase = {
    rpc: async (name, args) => {
      calls.push([name, args]);
      if (rpcThrows) throw new Error('network');
      return { data, error: rpcError };
    },
  };
  const storage = {
    loadAcquisition: () => stored,
    saveAcquisition: (value) => { stored = value; },
    clearAcquisition: () => { stored = null; },
  };
  const api = createSourceLoader({ '@/lib/supabase': { supabase }, '@/lib/storage': storage })('@/lib/acquisitionApi');
  return { ...api, calls, get stored() { return stored; } };
}

test('링크의 utm과 처음 본 경로만 뽑고, 다른 쿼리·해시는 버린다', () => {
  assert.deepEqual(readAcquisition(THREADS, '', NOW), {
    source: 'threads', medium: 'social', campaign: 'launch_2026_11', referrer: null, landing: '/intro', seenAt: NOW.toISOString(),
  });
  // 이상한 글자는 빼고 길이를 자른다
  assert.equal(readAcquisition('https://jobdiary.vercel.app/?utm_source=<b>x</b>', '', NOW).source, 'bxb');
  assert.equal(readAcquisition(`https://jobdiary.vercel.app/?utm_source=${'a'.repeat(80)}`, '', NOW).source.length, 60);
  // 바로 들어온 방문은 남기지 않는다
  assert.equal(readAcquisition('https://jobdiary.vercel.app/intro', '', NOW), null);
  assert.equal(readAcquisition('not a url', '', NOW), null);
});

test('이전 사이트는 소개 페이지로 들어왔을 때만, 도메인만 남긴다', () => {
  assert.equal(readAcquisition('https://jobdiary.vercel.app/intro', 'https://l.threads.com/?u=https%3A%2F%2Fjobdiary', NOW).referrer, 'l.threads.com');
  // Google 로그인·메일 확인 링크에서 돌아오는 곳은 세지 않는다
  assert.equal(readAcquisition('https://jobdiary.vercel.app/login', 'https://accounts.google.com/', NOW), null);
  assert.equal(readAcquisition('https://jobdiary.vercel.app/', 'https://mail.naver.com/read', NOW), null);
  // 같은 사이트 안에서 옮긴 것은 바깥 출처가 아니다
  assert.equal(readAcquisition('https://jobdiary.vercel.app/intro', 'https://jobdiary.vercel.app/login', NOW), null);
});

test('30일 지난 출처는 그 링크 덕으로 보지 않는다', () => {
  const found = readAcquisition(THREADS, '', NOW);
  assert.equal(isFreshAcquisition(found, new Date('2026-12-25T03:00:00.000Z')), true);
  assert.equal(isFreshAcquisition(found, new Date('2026-12-26T03:00:01.000Z')), false);
});

test('첫 출처만 기억하고, 오래된 것은 새 출처로 바꾼다', () => {
  const api = setup();
  assert.equal(api.rememberAcquisition(THREADS, '', NOW), true);
  assert.equal(api.rememberAcquisition('https://jobdiary.vercel.app/?utm_source=kakao', '', NOW), false);
  assert.equal(api.stored.source, 'threads');
  assert.equal(api.rememberAcquisition('https://jobdiary.vercel.app/?utm_source=kakao', '', new Date('2027-01-30T00:00:00.000Z')), true);
  assert.equal(api.stored.source, 'kakao');
});

test('가입 직후 한 번 보내고 지운다. 실패하면 남겨 다시 시도한다', async () => {
  const none = setup();
  assert.equal(await none.recordAcquisition(NOW), 'none');
  assert.equal(none.calls.length, 0, '기억한 게 없으면 요청 없음');

  const ok = setup();
  ok.rememberAcquisition(THREADS, '', NOW);
  const results = await Promise.all([ok.recordAcquisition(NOW), ok.recordAcquisition(NOW)]);
  assert.deepEqual(results, ['recorded', 'recorded']);
  assert.equal(ok.calls.length, 1, '동시에 불러도 한 번');
  assert.deepEqual(ok.calls[0], ['record_acquisition', { p_source: 'threads', p_medium: 'social', p_campaign: 'launch_2026_11', p_referrer: null, p_landing: '/intro' }]);
  assert.equal(ok.stored, null);

  const existing = setup({ data: false }); // 기존 사용자라 서버가 안 받음
  existing.rememberAcquisition(THREADS, '', NOW);
  assert.equal(await existing.recordAcquisition(NOW), 'skipped');
  assert.equal(existing.stored, null);

  const warn = console.warn;
  console.warn = () => {};
  try {
    for (const options of [{ rpcError: { message: 'function not found' } }, { rpcThrows: true }]) {
      const failed = setup(options);
      failed.rememberAcquisition(THREADS, '', NOW);
      assert.equal(await failed.recordAcquisition(NOW), 'failed');
      assert.equal(failed.stored.source, 'threads', '남겨 두고 다음에 다시');
    }
  } finally {
    console.warn = warn;
  }

  const old = setup();
  old.rememberAcquisition(THREADS, '', NOW);
  assert.equal(await old.recordAcquisition(new Date('2027-01-30T00:00:00.000Z')), 'expired');
  assert.equal(old.calls.length, 0);
  assert.equal(old.stored, null);
});

test('DB: 브라우저는 표를 못 읽고 못 쓰며, 함수가 본인·가입 하루 안·계정당 한 번·값 정리를 지킨다', () => {
  const sql = fs.readFileSync('../../supabase/migrations/20261126140000_user_acquisition.sql', 'utf8');
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public\.user_acquisition from public, anon, authenticated/);
  assert.match(sql, /security definer\s+set search_path = ''/);
  assert.match(sql, /\(select auth\.uid\(\)\)/);
  assert.match(sql, /v_created_at < now\(\) - interval '1 day'/);
  assert.match(sql, /on conflict \(user_id\) do nothing/);
  assert.match(sql, /on delete cascade/);
  assert.match(sql, /split_part\(coalesce\(p_referrer, ''\), '\/', 1\)/);
  assert.match(sql, /grant execute on function public\.record_acquisition\(text, text, text, text, text\) to authenticated/);
  assert.doesNotMatch(sql, /grant [^;]*user_acquisition to (anon|authenticated)/);
});
