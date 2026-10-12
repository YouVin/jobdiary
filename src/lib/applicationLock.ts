let pending: Promise<unknown> = Promise.resolve();

// 조회/가져오기/수동 수정을 직렬화한다. 지원 브라우저에서는 같은 origin의 탭들도 공유한다.
export function withApplicationLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(async (): Promise<T> => {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return await navigator.locks.request('jobdiary-applications', operation);
    }
    return operation();
  });
  pending = result.catch(() => undefined);
  return result;
}
