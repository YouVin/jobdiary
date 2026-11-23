import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/common/Icon';

// 디자인 시스템 빈 상태 (#201). 보여줄 것이 없을 때 그 자리에 두고, 다음에 할 일을 알려준다.
// 순서: 아이콘 → 한 줄 설명(15/600) → 보조 설명(13) → 할 수 있는 일(작은 보조 버튼).
// 문구는 상황 + 다음 행동: "이번 주에는 일정이 없어요" / "면접이나 공고 마감을 기록하면 여기에 보여드려요".
interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'calendar', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line-input px-6 py-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-subtle text-text-secondary">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="text-body font-semibold text-text-primary">{title}</p>
      {description && <p className="text-label text-text-secondary">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
