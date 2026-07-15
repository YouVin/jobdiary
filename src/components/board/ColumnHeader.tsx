import { Status } from '@/types/application';
import { STATUS_INFO } from '@/constants/status';

interface ColumnHeaderProps {
  status: Status;
  count: number;
}

// 상태별 점 색상 토큰 매핑 (Tailwind가 클래스명을 정적으로 인식하도록 리터럴로 작성)
const STATUS_DOT_CLASS: Record<Status, string> = {
  applied: 'bg-status-applied',
  screening: 'bg-status-screening',
  interview: 'bg-status-interview',
  interviewed: 'bg-status-interview',
  offer: 'bg-status-offer',
  rejected: 'bg-status-rejected',
  canceled: 'bg-status-canceled',
};

export function ColumnHeader({ status, count }: ColumnHeaderProps) {
  const { label } = STATUS_INFO[status];

  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-1.75 w-1.75 rounded-full ${STATUS_DOT_CLASS[status]}`} />
      <span className="text-[12px] font-medium text-text-primary">{label}</span>
      <span className="text-[11px] font-normal text-text-muted">{count}</span>
    </div>
  );
}
