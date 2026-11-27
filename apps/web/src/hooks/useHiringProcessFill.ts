'use client';

import { getPostingReference } from '@jobdiary/shared';
import { useEffect, useRef } from 'react';
import { isExtensionReachable } from '@/lib/postingPage';
import { readHiringProcess } from '@/lib/hiringProcessApi';
import { useApplicationStore } from '@/store/applicationStore';
import type { HiringProcess } from '@/types/application';
import { needsProcess } from '@/utils/hiringProcess';

const GAP_MS = 800; // 채용 사이트에 연달아 요청하지 않게 공고 사이를 띄운다

// 공고 전형 절차 자동 채우기 (#295). 가져오기·불러오기 뒤 아직 안 읽은 진행 중 지원을 하나씩 읽는다.
// 익스텐션이 탭 없이 백그라운드로 공고를 받아 오므로 화면에는 보이지 않는다. 익스텐션이 없으면 시작하지 않는다.
// 한 번에 한 줄만 돌고, 일시 오류는 이번 방문에서 건너뛰었다가 다음 방문에 다시 읽는다. 하루 한도면 멈춘다.
// 못 찾은 공고(none)는 며칠 뒤 다시 읽는다(needsProcess, #297).
export function useHiringProcessFill() {
  const userId = useApplicationStore((state) => state.userId);
  const historyReady = useApplicationStore((state) => state.historyReady);
  const hasTargets = useApplicationStore((state) => state.applications.some((application) => needsProcess(application)));
  const isRunning = useRef(false);
  const skipped = useRef(new Set<string>());
  // 같은 공고(중복 지원·다시 지원)는 한 번 읽은 결과를 쓴다. 공고 읽기·이미지 받기를 되풀이하지 않는다
  const byPosting = useRef(new Map<string, HiringProcess>());

  // 계정이 바뀌면 건너뛴 목록을 비운다
  useEffect(() => {
    skipped.current = new Set();
    byPosting.current = new Map();
  }, [userId]);

  useEffect(() => {
    if (!historyReady || !hasTargets || isRunning.current || !isExtensionReachable()) return;
    isRunning.current = true;
    let isCurrent = true;

    void (async () => {
      try {
        while (isCurrent) {
          const next = useApplicationStore.getState().applications.find((application) => needsProcess(application) && !skipped.current.has(application.id));
          if (!next) break;
          const postingKey = getPostingReference(next.url)?.url ?? '';
          const known = byPosting.current.get(postingKey);
          if (known) {
            if (!(await useApplicationStore.getState().saveHiringProcess(next.id, known))) skipped.current.add(next.id);
            continue;
          }
          const result = await readHiringProcess(next);
          if (!isCurrent) break;
          if ('process' in result) byPosting.current.set(postingKey, result.process);
          if ('stop' in result) break;
          if ('retry' in result) skipped.current.add(next.id);
          else if (!(await useApplicationStore.getState().saveHiringProcess(next.id, result.process))) skipped.current.add(next.id);
          await new Promise((resolve) => setTimeout(resolve, GAP_MS));
        }
      } finally {
        isRunning.current = false;
      }
    })();

    // 계정이 바뀌거나 화면을 떠나면 다음 공고부터 멈춘다
    return () => {
      isCurrent = false;
    };
  }, [historyReady, hasTargets, userId]);
}
