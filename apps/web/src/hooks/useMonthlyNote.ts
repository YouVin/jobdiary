'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getMonthlyNote, saveMonthlyNote } from '@/lib/monthlyNotesApi';

export type MonthlyNoteStatus = 'loading' | 'idle' | 'saving' | 'saved' | 'error';

interface NoteState {
  month: string | null; // 이 값이 지금 달과 다르면 아직 불러오는 중
  note: string;
  status: Exclude<MonthlyNoteStatus, 'loading'>;
}

// 이번 달 한 줄 불러오기·저장 (#316). 칸을 벗어날 때(blur) 저장하고, 달을 넘기거나 창을 닫을 때 바뀐 것이 남았으면 저장한다.
export function useMonthlyNote(month: string) {
  const [state, setState] = useState<NoteState>({ month: null, note: '', status: 'idle' });
  const saved = useRef(''); // 서버에 있는 글
  const draft = useRef(''); // 지금 칸의 글(정리할 때 읽는다)

  // 달이 바뀌면 그 달의 한 줄을 불러온다. 떠나는 달에 저장 안 된 글이 있으면 먼저 저장한다
  useEffect(() => {
    let isCurrent = true;
    void getMonthlyNote(month).then(({ note, error }) => {
      if (!isCurrent) return;
      saved.current = note;
      draft.current = note;
      setState({ month, note, status: error ? 'error' : 'idle' });
    });
    return () => {
      isCurrent = false;
      if (draft.current.trim() !== saved.current.trim()) void saveMonthlyNote(month, draft.current);
    };
  }, [month]);

  const commit = useCallback(async () => {
    const text = draft.current;
    if (text.trim() === saved.current.trim()) return;
    setState((current) => ({ ...current, status: 'saving' }));
    const ok = await saveMonthlyNote(month, text);
    if (ok) saved.current = text.trim();
    setState((current) => ({ ...current, status: ok ? 'saved' : 'error' }));
  }, [month]);

  const isLoaded = state.month === month;
  return {
    note: isLoaded ? state.note : '',
    status: (isLoaded ? state.status : 'loading') as MonthlyNoteStatus,
    change: (value: string) => {
      draft.current = value;
      setState((current) => ({ ...current, note: value }));
    },
    commit: () => void commit(),
  };
}
