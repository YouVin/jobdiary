import { supabase } from '@/lib/supabase';

// 앱 안 의견 보내기 (#278). 서버 함수가 사용자·시각을 정하고 하루 10번까지 저장한다.
// 보내는 것은 글과 지금 화면 경로뿐이다(쿼리·해시는 빼서 일회용 코드가 섞이지 않게).
export const FEEDBACK_MAX_LENGTH = 1000;

export type FeedbackResult = 'sent' | 'limited' | 'failed';

export async function sendFeedback(message: string, path: string): Promise<FeedbackResult> {
  try {
    const { data, error } = await supabase.rpc('send_feedback', { p_message: message.trim().slice(0, FEEDBACK_MAX_LENGTH), p_page: path.split(/[?#]/)[0].slice(0, 200) });
    if (error) return 'failed';
    return data === true ? 'sent' : 'limited';
  } catch {
    return 'failed';
  }
}
