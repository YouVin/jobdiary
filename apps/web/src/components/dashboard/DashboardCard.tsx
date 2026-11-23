import { clsx } from 'clsx';
import { Icon } from '@/components/common/Icon';

interface DashboardCardProps {
  title?: string;
  titleId?: string;
  icon?: 'calendar';
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

// 홈 대시보드 카드 틀. 제목이 없으면 aria-label 없는 단순 영역으로 쓴다.
export function DashboardCard({ title, titleId, icon, action, className, children }: DashboardCardProps) {
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={clsx('h-full min-w-0 rounded-card border border-card-border bg-card p-5 shadow-card md:p-6', className)}
    >
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 id={titleId} className="flex items-center gap-2 text-legacy-body font-semibold text-text-primary">
            {icon && <Icon name={icon} className="h-4 w-4 text-text-secondary" />}
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
