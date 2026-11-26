import { supabase } from '@/lib/supabase';
import { loadActivityDate, saveActivityDate } from '@/lib/storage';
import { getTodayInKorea } from '@/utils/applicationDeadline';

// 사용량 지표(#256): 로그인·동의를 마친 사용자가 들어온 날을 하루 한 번만 기록한다.
// 서버 함수(record_daily_activity)가 사용자와 한국 날짜를 정하므로 여기서는 보내는 값이 없다.
// 이 브라우저에서 오늘 이미 기록했으면 요청하지 않는다. 실패해도 화면에는 영향이 없다.

// 같은 화면이 두 번 그려지거나(개발 모드) 탭이 동시에 보여질 때 요청이 겹치지 않게 한다.
const pending = new Set<string>();

export async function recordDailyActivity(userId: string, today = getTodayInKorea()): Promise<boolean> {
  // 1) 오늘 이미 기록했거나 기록 중이면 건너뛴다
  const key = `${userId}:${today}`;
  if (loadActivityDate(userId) === today || pending.has(key)) {
    return false;
  }

  // 2) 서버에 기록하고, 성공하면 이 브라우저에 오늘 날짜를 남긴다
  pending.add(key);
  try {
    const { error } = await supabase.rpc('record_daily_activity');
    if (error) {
      console.warn('failed to record daily activity', error.message);
      return false;
    }
    saveActivityDate(userId, today);
    return true;
  } catch (error) {
    console.warn('failed to record daily activity', error);
    return false;
  } finally {
    pending.delete(key);
  }
}
