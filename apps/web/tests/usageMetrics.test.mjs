import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

// 사용량 지표(#256): 하루 한 번 방문 기록, 통계로 보내는 주소에서 쿼리 빼기, DB 권한.
function setup({ rpcError = null, rpcThrows = false } = {}) {
  const saved = new Map();
  const calls = [];
  const supabase = {
    rpc: async (name) => {
      calls.push(name);
      if (rpcThrows) throw new Error('network');
      return { error: rpcError };
    },
  };
  const storage = {
    loadActivityDate: (userId) => saved.get(userId) ?? null,
    saveActivityDate: (userId, date) => saved.set(userId, date),
  };
  const load = createSourceLoader({ '@/lib/supabase': { supabase }, '@/lib/storage': storage });
  return { ...load('@/lib/activityApi'), saved, calls };
}

test('하루 첫 방문만 서버에 기록하고, 같은 날 다시 와도 요청하지 않는다', async () => {
  const { recordDailyActivity, saved, calls } = setup();
  assert.equal(await recordDailyActivity('user-a', '2026-11-25'), true);
  assert.equal(await recordDailyActivity('user-a', '2026-11-25'), false);
  assert.deepEqual(calls, ['record_daily_activity']);
  assert.equal(saved.get('user-a'), '2026-11-25');
  // 다음 날·다른 계정은 다시 기록한다
  assert.equal(await recordDailyActivity('user-a', '2026-11-26'), true);
  assert.equal(await recordDailyActivity('user-b', '2026-11-26'), true);
  assert.equal(calls.length, 3);
});

test('동시에 두 번 불러도 요청은 한 번이다 (개발 모드 두 번 그리기·탭 전환)', async () => {
  const { recordDailyActivity, calls } = setup();
  const results = await Promise.all([recordDailyActivity('user-a', '2026-11-25'), recordDailyActivity('user-a', '2026-11-25')]);
  assert.deepEqual(results.sort(), [false, true]);
  assert.equal(calls.length, 1);
});

test('기록에 실패하면 날짜를 남기지 않아 다음에 다시 시도하고, 화면 쪽으로 오류를 던지지 않는다', async () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    const failed = setup({ rpcError: { message: 'function not found' } });
    assert.equal(await failed.recordDailyActivity('user-a', '2026-11-25'), false);
    assert.equal(failed.saved.size, 0);
    const offline = setup({ rpcThrows: true });
    assert.equal(await offline.recordDailyActivity('user-a', '2026-11-25'), false);
    assert.equal(offline.saved.size, 0);
  } finally {
    console.warn = warn;
  }
});

test('통계로 보내는 주소는 경로만 남긴다(일회용 코드·가져오기 신호 제외)', () => {
  const { analyticsUrl } = createSourceLoader()('@/utils/analyticsUrl');
  assert.equal(analyticsUrl('https://jobdiary.vercel.app/update-password?code=abc123#access_token=x'), 'https://jobdiary.vercel.app/update-password');
  assert.equal(analyticsUrl('https://jobdiary.vercel.app/board?import=1'), 'https://jobdiary.vercel.app/board');
  assert.equal(analyticsUrl('https://jobdiary.vercel.app/'), 'https://jobdiary.vercel.app/');
  assert.equal(analyticsUrl('not a url'), null);
});

test('DB: 브라우저는 방문 표를 직접 읽거나 쓰지 못하고, 함수가 본인·한국 날짜를 정한다', () => {
  const sql = fs.readFileSync('../../supabase/migrations/20261125120000_user_activity.sql', 'utf8');
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public\.user_activity from public, anon, authenticated/);
  assert.match(sql, /security definer\s+set search_path = ''/);
  assert.match(sql, /\(select auth\.uid\(\)\)/);
  assert.match(sql, /at time zone 'Asia\/Seoul'/);
  assert.match(sql, /on delete cascade/);
  assert.match(sql, /grant execute on function public\.record_daily_activity\(\) to authenticated/);
  assert.doesNotMatch(sql, /grant [^;]*user_activity to (anon|authenticated)/);
  const checks = fs.readFileSync('../../supabase/checks/usage_metrics.sql', 'utf8');
  assert.doesNotMatch(checks, /\b(insert|update|delete|drop|alter|create)\b/i, '집계 SQL은 읽기만');
});
