'use client';

import { useEffect, useState } from 'react';
import { useApplicationStore } from '@/store/applicationStore';
import { mockApplications } from '@/constants/mockData';
import { KanbanBoard } from '@/components/board/KanbanBoard';

export function DashboardClient() {
  const [mounted, setMounted] = useState(false);
  const applications = useApplicationStore((state) => state.applications);
  const loadApplications = useApplicationStore((state) => state.loadApplications);

  // localStorage 로드는 클라이언트에서만 가능해서 마운트 후에 실행
  useEffect(() => {
    loadApplications();
    setMounted(true);
  }, [loadApplications]);

  // 개발 단계: 스토어가 비어있으면 더미 데이터로 초기화
  useEffect(() => {
    if (mounted && applications.length === 0) {
      useApplicationStore.setState({ applications: mockApplications });
    }
  }, [mounted, applications.length]);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="min-h-[120px] animate-pulse rounded-[10px] bg-column" />
        ))}
      </div>
    );
  }

  return <KanbanBoard applications={applications} />;
}
