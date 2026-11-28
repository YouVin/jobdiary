import { supabase } from '@/lib/supabase';

// 이번 달 한 줄 (#316). 달마다 하나, 본인만 읽고 쓴다(monthly_notes RLS). 비우면 지운다.
export const MONTHLY_NOTE_MAX_LENGTH = 100;
const TABLE = 'monthly_notes';

export async function getMonthlyNote(month: string): Promise<{ note: string; error: boolean }> {
  try {
    const { data, error } = await supabase.from(TABLE).select('note').eq('month', month).maybeSingle<{ note: string }>();
    if (error) return { note: '', error: true };
    return { note: data?.note ?? '', error: false };
  } catch {
    return { note: '', error: true };
  }
}

export async function saveMonthlyNote(month: string, note: string): Promise<boolean> {
  const text = note.trim().slice(0, MONTHLY_NOTE_MAX_LENGTH);
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return false;
    if (!text) {
      const { error } = await supabase.from(TABLE).delete().eq('user_id', userId).eq('month', month);
      return !error;
    }
    const { error } = await supabase.from(TABLE).upsert({ user_id: userId, month, note: text, updated_at: new Date().toISOString() }, { onConflict: 'user_id,month' });
    return !error;
  } catch {
    return false;
  }
}
