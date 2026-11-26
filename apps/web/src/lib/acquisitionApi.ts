import { supabase } from '@/lib/supabase';
import { clearAcquisition, loadAcquisition, saveAcquisition } from '@/lib/storage';
import { isFreshAcquisition, readAcquisition } from '@/utils/acquisition';

// 가입 경로 (#290). ① 처음 들어올 때 출처를 브라우저에 기억하고 ② 가입·동의를 마치면 서버에 계정당 한 번 보낸다.
// 서버 함수(record_acquisition)가 사용자를 정하고, 가입한 지 하루가 안 된 계정만 받는다(기존 사용자는 세지 않음).

// ① 출처가 있는 첫 방문만 기억한다. 이미 기억한 출처가 30일 안이면 그대로 둔다(첫 출처 기준).
export function rememberAcquisition(href: string, referrer: string, now = new Date()): boolean {
  const found = readAcquisition(href, referrer, now);
  if (!found) return false;
  const stored = loadAcquisition();
  if (stored && isFreshAcquisition(stored, now)) return false;
  saveAcquisition(found);
  return true;
}

export type AcquisitionResult = 'none' | 'expired' | 'recorded' | 'skipped' | 'failed';

// 개발 모드에서 두 번 그려지거나 탭이 겹쳐도 요청은 한 번이다
let pending: Promise<AcquisitionResult> | null = null;

// ② 기억한 출처를 보낸다. 서버가 받았든(recorded) 기존 사용자라 안 받았든(skipped) 다시 보낼 일이 없어 지운다.
//    실패하면 남겨 두어 다음 화면에서 다시 시도한다. 화면에는 영향이 없다.
export function recordAcquisition(now = new Date()): Promise<AcquisitionResult> {
  if (pending) return pending;
  pending = (async (): Promise<AcquisitionResult> => {
    const stored = loadAcquisition();
    if (!stored) return 'none';
    if (!isFreshAcquisition(stored, now)) {
      clearAcquisition();
      return 'expired';
    }
    try {
      const { data, error } = await supabase.rpc('record_acquisition', {
        p_source: stored.source,
        p_medium: stored.medium,
        p_campaign: stored.campaign,
        p_referrer: stored.referrer,
        p_landing: stored.landing,
      });
      if (error) {
        console.warn('failed to record acquisition', error.message);
        return 'failed';
      }
      clearAcquisition();
      return data === true ? 'recorded' : 'skipped';
    } catch (error) {
      console.warn('failed to record acquisition', error);
      return 'failed';
    }
  })().finally(() => {
    pending = null;
  });
  return pending;
}
