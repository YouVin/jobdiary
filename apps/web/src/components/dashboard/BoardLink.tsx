import Link from 'next/link';
import { Icon } from '@/components/common/Icon';

// 대시보드 카드 머리의 "지원보드로 이동" 링크
export function BoardLink({ label = '지원보드' }: { label?: string }) {
  return (
    <Link
      href="/board"
      className="flex shrink-0 items-center gap-1 rounded text-label text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {label}
      <Icon name="arrow-right" className="h-3 w-3" />
    </Link>
  );
}
