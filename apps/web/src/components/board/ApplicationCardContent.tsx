import Image from 'next/image';
import { clsx } from 'clsx';
import { Badge } from '@/components/ui/Badge';
import type { Application, Platform } from '@/types/application';
import { daysBetween, toDateOnly } from '@/utils/applicationStats';

interface ApplicationCardContentProps {
  application: Application;
  isDuplicate?: boolean;
  today: string;
}

const SITE_ICON: Record<Exclude<Platform, 'manual'>, string> = {
  saramin: '/brands/saramin.png',
  jobkorea: '/brands/jobkorea.png',
  wanted: '/brands/wanted.png',
};

function shortDate(date: string | null): string {
  return date ? `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}` : '';
}

// 앞으로 가장 가까운 면접·마감 하나 (오늘 포함)
function nextTag(application: Application, today: string): { label: string; isToday: boolean } | null {
  const candidates: Array<[string, string | null]> = [
    ['면접', toDateOnly(application.interviewDate)],
    ['마감', toDateOnly(application.deadlineAt)],
  ];
  let best: { label: string; isToday: boolean; days: number } | null = null;
  for (const [kind, date] of candidates) {
    if (!date) continue;
    const days = daysBetween(today, date);
    if (days < 0 || (best && best.days <= days)) continue;
    best = { label: days === 0 ? `${kind} D-DAY` : `${kind} D-${days}`, isToday: days === 0, days };
  }
  return best;
}

// 칸반 카드 내용 (#204, 캔버스 보드 시안): 회사 · 직무 · (사이트 아이콘, 지원일) · 일정 한 줄.
// 표시는 한 개만: 중복 지원(지원일 줄 오른쪽 빨간 뱃지) > 가까운 면접·마감 D-day > 마감 자동 탈락.
// D-day와 자동 탈락은 뱃지 대신 지원일 아래 왼쪽 정렬 글자 한 줄로 둔다(#215). 칸반 열이 좁아(카드 안쪽 약 120px)
// '마감 D-37' 뱃지가 지원일 줄에 들어가지 못하고 혼자 다음 줄 오른쪽으로 떨어져 보였기 때문이다. D-DAY만 주황 글자로 강조한다.
export function ApplicationCardContent({ application, isDuplicate = false, today }: ApplicationCardContentProps) {
  const { company, position, platform, appliedAt, statusSource, status } = application;
  const isClosed = status === 'offer' || status === 'rejected' || status === 'canceled';
  const tag = isClosed ? null : nextTag(application, today);

  return (
    <>
      <p className="truncate text-body font-semibold text-text-primary">{company}</p>
      <p className="truncate text-label text-text-secondary">{position}</p>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        {platform !== 'manual' && <Image src={SITE_ICON[platform]} alt="" width={16} height={16} unoptimized className="h-4 w-4 shrink-0 rounded-xs" />}
        <span className="text-caption font-normal text-text-secondary tabular-nums">{shortDate(toDateOnly(appliedAt))}</span>
        {isDuplicate && (
          <span className="ml-auto">
            <Badge tone="danger">중복</Badge>
          </span>
        )}
      </div>
      {!isDuplicate && tag && (
        <p className={clsx('truncate text-caption tabular-nums', tag.isToday ? 'text-today-text' : 'text-text-secondary')}>{tag.label}</p>
      )}
      {!isDuplicate && !tag && statusSource === 'deadline' && <p className="truncate text-caption font-normal text-text-secondary">자동 탈락</p>}
    </>
  );
}
