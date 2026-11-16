import { STATUS_DOT_CLASS, STATUS_INFO } from '@/constants/status';
import { Status } from '@/types/application';

interface ColumnHeaderProps {
  status: Status;
  count: number;
}

export function ColumnHeader({ status, count }: ColumnHeaderProps) {
  const { label } = STATUS_INFO[status];

  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASS[status]}`} />
      <span className="text-label font-medium text-text-primary">{label}</span>
      <span className="text-caption font-normal text-text-muted">{count}</span>
    </div>
  );
}
