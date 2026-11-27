'use client';

import { useEffect, useRef } from 'react';
import { isExtensionReachable } from '@/lib/postingPage';
import { readHiringProcess } from '@/lib/hiringProcessApi';
import { useApplicationStore } from '@/store/applicationStore';
import type { Application } from '@/types/application';
import { findSiblingProcess, needsProcess, pickNextProcessTarget, postingKeyOf } from '@/utils/hiringProcess';

const GAP_MS = 800; // 채용 사이트에 연달아 요청하지 않게 공고 사이를 띄운다
const PAUSE_CHECK_MS = 500;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 상세 패널에서 연 지원을 다음 차례로 올린다(#299). 채우기는 화면 전체에 하나라 모듈 값으로 둔다.
let priorityId: string | null = null;

// 공고 전형 절차 자동 채우기 (#295). 가져오기·불러오기 뒤 아직 안 읽은 진행 중 지원을 하나씩 읽는다.
// 익스텐션이 탭 없이 백그라운드로 공고를 받아 오므로 화면에는 보이지 않는다. 익스텐션이 없으면 시작하지 않는다.
// - 한 번에 하나씩, 연 지원 → 면접 예정 → 서류 통과 → 면접 완료 → 지원 완료 순(#299)
// - 가져오기 중이면 같은 사이트에 겹쳐 요청하지 않게 멈췄다가 끝나면 잇는다(#299)
// - 같은 공고는 이미 읽은 다른 지원의 결과를 복사한다. 일시 오류는 그 방문에서 같은 공고 전부 건너뛰고 다음 방문에 다시(#299)
// - 하루 한도면 멈춘다. 못 찾은 공고(none)는 며칠 뒤 다시 읽는다(needsProcess, #297).
export function useHiringProcessFill({ isPaused }: { isPaused: boolean }) {
  const userId = useApplicationStore((state) => state.userId);
  const historyReady = useApplicationStore((state) => state.historyReady);
  const hasTargets = useApplicationStore((state) => state.applications.some((application) => needsProcess(application)));
  const isRunning = useRef(false);
  const pausedRef = useRef(isPaused);
  const skippedPostings = useRef(new Set<string>());
  const skippedIds = useRef(new Set<string>());

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  // 계정이 바뀌면 건너뛴 목록을 비운다
  useEffect(() => {
    skippedPostings.current = new Set();
    skippedIds.current = new Set();
    priorityId = null;
  }, [userId]);

  useEffect(() => {
    if (!historyReady || !hasTargets || isRunning.current || !isExtensionReachable()) return;
    isRunning.current = true;
    let isCurrent = true;
    const isSkipped = (application: Application) => skippedIds.current.has(application.id) || skippedPostings.current.has(postingKeyOf(application) ?? '');

    void (async () => {
      try {
        while (isCurrent) {
          // 가져오기 중이면 기다린다
          while (isCurrent && pausedRef.current) await wait(PAUSE_CHECK_MS);
          if (!isCurrent) break;

          const store = useApplicationStore.getState();
          const next = pickNextProcessTarget(store.applications, { priorityId, skip: isSkipped });
          if (!next) break;
          if (next.id === priorityId) priorityId = null;
          const postingKey = postingKeyOf(next) ?? '';

          // 같은 공고를 이미 읽은 지원이 있으면 복사(공고를 다시 읽지 않는다)
          const sibling = findSiblingProcess(store.applications, next);
          if (sibling) {
            if (!(await store.saveHiringProcess(next.id, sibling))) skippedIds.current.add(next.id);
            continue;
          }

          const result = await readHiringProcess(next);
          if (!isCurrent) break;
          if ('stop' in result) break;
          if ('retry' in result) skippedPostings.current.add(postingKey);
          else if (!(await useApplicationStore.getState().saveHiringProcess(next.id, result.process))) skippedIds.current.add(next.id);
          await wait(GAP_MS);
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

// 상세 패널: 아직 안 읽은 지원이면 다음 차례로 올리고, 읽는 중이라고 알린다.
export function useHiringProcessPriority(application: Pick<Application, 'id' | 'url' | 'status' | 'hiringProcess'>): boolean {
  // 상세 패널은 누른 뒤에만 그려져(서버 렌더 없음) 익스텐션 여부를 바로 본다
  const isReading = needsProcess(application) && application.hiringProcess == null && typeof window !== 'undefined' && isExtensionReachable();
  useEffect(() => {
    if (isReading) priorityId = application.id;
  }, [application.id, isReading]);
  return isReading;
}
