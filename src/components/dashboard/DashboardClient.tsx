'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useApplicationStore } from '@/store/applicationStore';
import { mockApplications } from '@/constants/mockData';
import { STATUS_ORDER } from '@/constants/status';
import { KanbanBoard } from '@/components/board/KanbanBoard';

const noopSubscribe = () => () => {};

export function DashboardClient() {
  // 서버에서는 항상 false, 하이드레이션 후 클라이언트에서만 true (hydration mismatch 방지)
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const applications = useApplicationStore((state) => state.applications);
  const loadApplications = useApplicationStore((state) => state.loadApplications);

  // localStorage 로드는 클라이언트에서만 가능해서 마운트 후에 실행
  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // 개발 단계 전용: 스토어가 비어있으면 더미 데이터로 초기화 (실유저는 빈 보드로 시작)
  useEffect(() => {
    if (mounted && process.env.NODE_ENV === 'development' && applications.length === 0) {
      useApplicationStore.setState({ applications: mockApplications });
    }
  }, [mounted, applications.length]);

  if (!mounted) {
    return (
      // lg:grid-cols-7은 KanbanBoard와 동일한 이유로 고정값(JIT 동적 클래스 purge 문제).
      // 스켈레톤 개수는 실제 컬럼 수와 어긋나지 않도록 STATUS_ORDER.length로 계산.
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-7">
        {Array.from({ length: STATUS_ORDER.length }).map((_, index) => (
          <div key={index} className="min-h-30 animate-pulse rounded-[10px] bg-column" />
        ))}
      </div>
    );
  }

  return <KanbanBoard applications={applications} />;
}
